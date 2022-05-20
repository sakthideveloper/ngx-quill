import { DOCUMENT, isPlatformServer } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { ChangeDetectorRef, Component, Directive, ElementRef, EventEmitter, forwardRef, Inject, Input, NgZone, Output, PLATFORM_ID, Renderer2, SecurityContext, ViewEncapsulation } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR } from '@angular/forms';
import { defaultModules } from './quill-defaults';
import { getFormat } from './helpers';
import { QuillService } from './quill.service';
import * as i0 from "@angular/core";
import * as i1 from "@angular/platform-browser";
import * as i2 from "./quill.service";
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class QuillEditorBase {
    constructor(injector, elementRef, cd, domSanitizer, platformId, renderer, zone, service) {
        this.elementRef = elementRef;
        this.cd = cd;
        this.domSanitizer = domSanitizer;
        this.platformId = platformId;
        this.renderer = renderer;
        this.zone = zone;
        this.service = service;
        this.required = false;
        this.customToolbarPosition = 'top';
        this.sanitize = false;
        this.styles = null;
        this.strict = true;
        this.customOptions = [];
        this.customModules = [];
        this.preserveWhitespace = false;
        this.trimOnValidation = false;
        this.compareValues = false;
        this.filterNull = false;
        /*
        https://github.com/KillerCodeMonkey/ngx-quill/issues/1257 - fix null value set
      
        provide default empty value
        by default null
      
        e.g. defaultEmptyValue="" - empty string
      
        <quill-editor
          defaultEmptyValue=""
          formControlName="message"
        ></quill-editor>
        */
        this.defaultEmptyValue = null;
        this.onEditorCreated = new EventEmitter();
        this.onEditorChanged = new EventEmitter();
        this.onContentChanged = new EventEmitter();
        this.onSelectionChanged = new EventEmitter();
        this.onFocus = new EventEmitter();
        this.onBlur = new EventEmitter();
        this.disabled = false; // used to store initial value before ViewInit
        this.subscription = null;
        this.valueGetter = (quillEditor, editorElement) => {
            let html = editorElement.querySelector('.ql-editor').innerHTML;
            if (html === '<p><br></p>' || html === '<div><br></div>') {
                html = this.defaultEmptyValue;
            }
            let modelValue = html;
            const format = getFormat(this.format, this.service.config.format);
            if (format === 'text') {
                modelValue = quillEditor.getText();
            }
            else if (format === 'object') {
                modelValue = quillEditor.getContents();
            }
            else if (format === 'json') {
                try {
                    modelValue = JSON.stringify(quillEditor.getContents());
                }
                catch (e) {
                    modelValue = quillEditor.getText();
                }
            }
            return modelValue;
        };
        this.valueSetter = (quillEditor, value) => {
            const format = getFormat(this.format, this.service.config.format);
            if (format === 'html') {
                if (this.sanitize) {
                    value = this.domSanitizer.sanitize(SecurityContext.HTML, value);
                }
                return quillEditor.clipboard.convert(value);
            }
            else if (format === 'json') {
                try {
                    return JSON.parse(value);
                }
                catch (e) {
                    return [{ insert: value }];
                }
            }
            return value;
        };
        this.selectionChangeHandler = (range, oldRange, source) => {
            const shouldTriggerOnModelTouched = !range && !!this.onModelTouched;
            // only emit changes when there's any listener
            if (!this.onBlur.observers.length &&
                !this.onFocus.observers.length &&
                !this.onSelectionChanged.observers.length &&
                !shouldTriggerOnModelTouched) {
                return;
            }
            this.zone.run(() => {
                if (range === null) {
                    this.onBlur.emit({
                        editor: this.quillEditor,
                        source
                    });
                }
                else if (oldRange === null) {
                    this.onFocus.emit({
                        editor: this.quillEditor,
                        source
                    });
                }
                this.onSelectionChanged.emit({
                    editor: this.quillEditor,
                    oldRange,
                    range,
                    source
                });
                if (shouldTriggerOnModelTouched) {
                    this.onModelTouched();
                }
                this.cd.markForCheck();
            });
        };
        this.textChangeHandler = (delta, oldDelta, source) => {
            // only emit changes emitted by user interactions
            const text = this.quillEditor.getText();
            const content = this.quillEditor.getContents();
            let html = this.editorElem.querySelector('.ql-editor').innerHTML;
            if (html === '<p><br></p>' || html === '<div><br></div>') {
                html = this.defaultEmptyValue;
            }
            const trackChanges = this.trackChanges || this.service.config.trackChanges;
            const shouldTriggerOnModelChange = (source === 'user' || trackChanges && trackChanges === 'all') && !!this.onModelChange;
            // only emit changes when there's any listener
            if (!this.onContentChanged.observers.length && !shouldTriggerOnModelChange) {
                return;
            }
            this.zone.run(() => {
                if (shouldTriggerOnModelChange) {
                    this.onModelChange(this.valueGetter(this.quillEditor, this.editorElem));
                }
                this.onContentChanged.emit({
                    content,
                    delta,
                    editor: this.quillEditor,
                    html,
                    oldDelta,
                    source,
                    text
                });
                this.cd.markForCheck();
            });
        };
        // eslint-disable-next-line max-len
        this.editorChangeHandler = (event, current, old, source) => {
            // only emit changes when there's any listener
            if (!this.onEditorChanged.observers.length) {
                return;
            }
            // only emit changes emitted by user interactions
            if (event === 'text-change') {
                const text = this.quillEditor.getText();
                const content = this.quillEditor.getContents();
                let html = this.editorElem.querySelector('.ql-editor').innerHTML;
                if (html === '<p><br></p>' || html === '<div><br></div>') {
                    html = this.defaultEmptyValue;
                }
                this.zone.run(() => {
                    this.onEditorChanged.emit({
                        content,
                        delta: current,
                        editor: this.quillEditor,
                        event,
                        html,
                        oldDelta: old,
                        source,
                        text
                    });
                    this.cd.markForCheck();
                });
            }
            else {
                this.zone.run(() => {
                    this.onEditorChanged.emit({
                        editor: this.quillEditor,
                        event,
                        oldRange: old,
                        range: current,
                        source
                    });
                    this.cd.markForCheck();
                });
            }
        };
        this.document = injector.get(DOCUMENT);
    }
    static normalizeClassNames(classes) {
        const classList = classes.trim().split(' ');
        return classList.reduce((prev, cur) => {
            const trimmed = cur.trim();
            if (trimmed) {
                prev.push(trimmed);
            }
            return prev;
        }, []);
    }
    async ngAfterViewInit() {
        if (isPlatformServer(this.platformId)) {
            return;
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const Quill = await this.service.getQuill();
        this.elementRef.nativeElement.insertAdjacentHTML(this.customToolbarPosition === 'top' ? 'beforeend' : 'afterbegin', this.preserveWhitespace ? '<pre quill-editor-element></pre>' : '<div quill-editor-element></div>');
        this.editorElem = this.elementRef.nativeElement.querySelector('[quill-editor-element]');
        const toolbarElem = this.elementRef.nativeElement.querySelector('[quill-editor-toolbar]');
        const modules = Object.assign({}, this.modules || this.service.config.modules);
        if (toolbarElem) {
            modules.toolbar = toolbarElem;
        }
        else if (modules.toolbar === undefined) {
            modules.toolbar = defaultModules.toolbar;
        }
        let placeholder = this.placeholder !== undefined ? this.placeholder : this.service.config.placeholder;
        if (placeholder === undefined) {
            placeholder = 'Insert text here ...';
        }
        if (this.styles) {
            Object.keys(this.styles).forEach((key) => {
                this.renderer.setStyle(this.editorElem, key, this.styles[key]);
            });
        }
        if (this.classes) {
            this.addClasses(this.classes);
        }
        this.customOptions.forEach((customOption) => {
            const newCustomOption = Quill.import(customOption.import);
            newCustomOption.whitelist = customOption.whitelist;
            Quill.register(newCustomOption, true);
        });
        this.customModules.forEach(({ implementation, path }) => {
            Quill.register(path, implementation);
        });
        let bounds = this.bounds && this.bounds === 'self' ? this.editorElem : this.bounds;
        if (!bounds) {
            bounds = this.service.config.bounds ? this.service.config.bounds : this.document.body;
        }
        let debug = this.debug;
        if (!debug && debug !== false && this.service.config.debug) {
            debug = this.service.config.debug;
        }
        let readOnly = this.readOnly;
        if (!readOnly && this.readOnly !== false) {
            readOnly = this.service.config.readOnly !== undefined ? this.service.config.readOnly : false;
        }
        let defaultEmptyValue = this.defaultEmptyValue;
        if (this.service.config.hasOwnProperty('defaultEmptyValue')) {
            defaultEmptyValue = this.service.config.defaultEmptyValue;
        }
        let scrollingContainer = this.scrollingContainer;
        if (!scrollingContainer && this.scrollingContainer !== null) {
            scrollingContainer =
                this.service.config.scrollingContainer === null
                    || this.service.config.scrollingContainer ? this.service.config.scrollingContainer : null;
        }
        let formats = this.formats;
        if (!formats && formats === undefined) {
            formats = this.service.config.formats ? [...this.service.config.formats] : (this.service.config.formats === null ? null : undefined);
        }
        this.zone.runOutsideAngular(() => {
            this.quillEditor = new Quill(this.editorElem, {
                bounds,
                debug: debug,
                formats: formats,
                modules,
                placeholder,
                readOnly,
                defaultEmptyValue,
                scrollingContainer: scrollingContainer,
                strict: this.strict,
                theme: this.theme || (this.service.config.theme ? this.service.config.theme : 'snow')
            });
            // Set optional link placeholder, Quill has no native API for it so using workaround
            if (this.linkPlaceholder) {
                const tooltip = this.quillEditor?.theme?.tooltip;
                const input = tooltip?.root?.querySelector('input[data-link]');
                if (input?.dataset) {
                    input.dataset.link = this.linkPlaceholder;
                }
            }
        });
        if (this.content) {
            const format = getFormat(this.format, this.service.config.format);
            if (format === 'text') {
                this.quillEditor.setText(this.content, 'silent');
            }
            else {
                const newValue = this.valueSetter(this.quillEditor, this.content);
                this.quillEditor.setContents(newValue, 'silent');
            }
            this.quillEditor.getModule('history').clear();
        }
        // initialize disabled status based on this.disabled as default value
        this.setDisabledState();
        this.addQuillEventListeners();
        // The `requestAnimationFrame` triggers change detection. There's no sense to invoke the `requestAnimationFrame` if anyone is
        // listening to the `onEditorCreated` event inside the template, for instance `<quill-view (onEditorCreated)="...">`.
        if (!this.onEditorCreated.observers.length && !this.onValidatorChanged) {
            return;
        }
        // The `requestAnimationFrame` will trigger change detection and `onEditorCreated` will also call `markDirty()`
        // internally, since Angular wraps template event listeners into `listener` instruction. We're using the `requestAnimationFrame`
        // to prevent the frame drop and avoid `ExpressionChangedAfterItHasBeenCheckedError` error.
        requestAnimationFrame(() => {
            if (this.onValidatorChanged) {
                this.onValidatorChanged();
            }
            this.onEditorCreated.emit(this.quillEditor);
        });
    }
    ngOnDestroy() {
        this.dispose();
    }
    ngOnChanges(changes) {
        if (!this.quillEditor) {
            return;
        }
        /* eslint-disable @typescript-eslint/dot-notation */
        if (changes.readOnly) {
            this.quillEditor.enable(!changes.readOnly.currentValue);
        }
        if (changes.placeholder) {
            this.quillEditor.root.dataset.placeholder =
                changes.placeholder.currentValue;
        }
        if (changes.defaultEmptyValue) {
            this.quillEditor.root.dataset.defaultEmptyValue =
                changes.defaultEmptyValue.currentValue;
        }
        if (changes.styles) {
            const currentStyling = changes.styles.currentValue;
            const previousStyling = changes.styles.previousValue;
            if (previousStyling) {
                Object.keys(previousStyling).forEach((key) => {
                    this.renderer.removeStyle(this.editorElem, key);
                });
            }
            if (currentStyling) {
                Object.keys(currentStyling).forEach((key) => {
                    this.renderer.setStyle(this.editorElem, key, this.styles[key]);
                });
            }
        }
        if (changes.classes) {
            const currentClasses = changes.classes.currentValue;
            const previousClasses = changes.classes.previousValue;
            if (previousClasses) {
                this.removeClasses(previousClasses);
            }
            if (currentClasses) {
                this.addClasses(currentClasses);
            }
        }
        // We'd want to re-apply event listeners if the `debounceTime` binding changes to apply the
        // `debounceTime` operator or vice-versa remove it.
        if (changes.debounceTime) {
            this.addQuillEventListeners();
        }
        /* eslint-enable @typescript-eslint/dot-notation */
    }
    addClasses(classList) {
        QuillEditorBase.normalizeClassNames(classList).forEach((c) => {
            this.renderer.addClass(this.editorElem, c);
        });
    }
    removeClasses(classList) {
        QuillEditorBase.normalizeClassNames(classList).forEach((c) => {
            this.renderer.removeClass(this.editorElem, c);
        });
    }
    writeValue(currentValue) {
        // optional fix for https://github.com/angular/angular/issues/14988
        if (this.filterNull && currentValue === null) {
            return;
        }
        this.content = currentValue;
        if (!this.quillEditor) {
            return;
        }
        const format = getFormat(this.format, this.service.config.format);
        const newValue = this.valueSetter(this.quillEditor, currentValue);
        if (this.compareValues) {
            const currentEditorValue = this.quillEditor.getContents();
            if (JSON.stringify(currentEditorValue) === JSON.stringify(newValue)) {
                return;
            }
        }
        if (currentValue) {
            if (format === 'text') {
                this.quillEditor.setText(currentValue);
            }
            else {
                this.quillEditor.setContents(newValue);
            }
            return;
        }
        this.quillEditor.setText('');
    }
    setDisabledState(isDisabled = this.disabled) {
        // store initial value to set appropriate disabled status after ViewInit
        this.disabled = isDisabled;
        if (this.quillEditor) {
            if (isDisabled) {
                this.quillEditor.disable();
                this.renderer.setAttribute(this.elementRef.nativeElement, 'disabled', 'disabled');
            }
            else {
                if (!this.readOnly) {
                    this.quillEditor.enable();
                }
                this.renderer.removeAttribute(this.elementRef.nativeElement, 'disabled');
            }
        }
    }
    registerOnChange(fn) {
        this.onModelChange = fn;
    }
    registerOnTouched(fn) {
        this.onModelTouched = fn;
    }
    registerOnValidatorChange(fn) {
        this.onValidatorChanged = fn;
    }
    validate() {
        if (!this.quillEditor) {
            return null;
        }
        const err = {};
        let valid = true;
        const text = this.quillEditor.getText();
        // trim text if wanted + handle special case that an empty editor contains a new line
        const textLength = this.trimOnValidation ? text.trim().length : (text.length === 1 && text.trim().length === 0 ? 0 : text.length - 1);
        const deltaOperations = this.quillEditor.getContents().ops;
        const onlyEmptyOperation = deltaOperations && deltaOperations.length === 1 && ['\n', ''].includes(deltaOperations[0].insert);
        if (this.minLength && textLength && textLength < this.minLength) {
            err.minLengthError = {
                given: textLength,
                minLength: this.minLength
            };
            valid = false;
        }
        if (this.maxLength && textLength > this.maxLength) {
            err.maxLengthError = {
                given: textLength,
                maxLength: this.maxLength
            };
            valid = false;
        }
        if (this.required && !textLength && onlyEmptyOperation) {
            err.requiredError = {
                empty: true
            };
            valid = false;
        }
        return valid ? null : err;
    }
    addQuillEventListeners() {
        this.dispose();
        // We have to enter the `<root>` zone when adding event listeners, so `debounceTime` will spawn the
        // `AsyncAction` there w/o triggering change detections. We still re-enter the Angular's zone through
        // `zone.run` when we emit an event to the parent component.
        this.zone.runOutsideAngular(() => {
            this.subscription = new Subscription();
            this.subscription.add(
            // mark model as touched if editor lost focus
            fromEvent(this.quillEditor, 'selection-change').subscribe(([range, oldRange, source]) => {
                this.selectionChangeHandler(range, oldRange, source);
            }));
            // The `fromEvent` supports passing JQuery-style event targets, the editor has `on` and `off` methods which
            // will be invoked upon subscription and teardown.
            let textChange$ = fromEvent(this.quillEditor, 'text-change');
            let editorChange$ = fromEvent(this.quillEditor, 'editor-change');
            if (typeof this.debounceTime === 'number') {
                textChange$ = textChange$.pipe(debounceTime(this.debounceTime));
                editorChange$ = editorChange$.pipe(debounceTime(this.debounceTime));
            }
            this.subscription.add(
            // update model if text changes
            textChange$.subscribe(([delta, oldDelta, source]) => {
                this.textChangeHandler(delta, oldDelta, source);
            }));
            this.subscription.add(
            // triggered if selection or text changed
            editorChange$.subscribe(([event, current, old, source]) => {
                this.editorChangeHandler(event, current, old, source);
            }));
        });
    }
    dispose() {
        if (this.subscription !== null) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}
QuillEditorBase.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.0.0", ngImport: i0, type: QuillEditorBase, deps: [{ token: i0.Injector }, { token: i0.ElementRef }, { token: i0.ChangeDetectorRef }, { token: i1.DomSanitizer }, { token: PLATFORM_ID }, { token: i0.Renderer2 }, { token: i0.NgZone }, { token: i2.QuillService }], target: i0.ɵɵFactoryTarget.Directive });
QuillEditorBase.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "12.0.0", version: "13.0.0", type: QuillEditorBase, inputs: { format: "format", theme: "theme", modules: "modules", debug: "debug", readOnly: "readOnly", placeholder: "placeholder", maxLength: "maxLength", minLength: "minLength", required: "required", formats: "formats", customToolbarPosition: "customToolbarPosition", sanitize: "sanitize", styles: "styles", strict: "strict", scrollingContainer: "scrollingContainer", bounds: "bounds", customOptions: "customOptions", customModules: "customModules", trackChanges: "trackChanges", preserveWhitespace: "preserveWhitespace", classes: "classes", trimOnValidation: "trimOnValidation", linkPlaceholder: "linkPlaceholder", compareValues: "compareValues", filterNull: "filterNull", debounceTime: "debounceTime", defaultEmptyValue: "defaultEmptyValue", valueGetter: "valueGetter", valueSetter: "valueSetter" }, outputs: { onEditorCreated: "onEditorCreated", onEditorChanged: "onEditorChanged", onContentChanged: "onContentChanged", onSelectionChanged: "onSelectionChanged", onFocus: "onFocus", onBlur: "onBlur" }, usesOnChanges: true, ngImport: i0 });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.0.0", ngImport: i0, type: QuillEditorBase, decorators: [{
            type: Directive
        }], ctorParameters: function () { return [{ type: i0.Injector }, { type: i0.ElementRef }, { type: i0.ChangeDetectorRef }, { type: i1.DomSanitizer }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }, { type: i0.Renderer2 }, { type: i0.NgZone }, { type: i2.QuillService }]; }, propDecorators: { format: [{
                type: Input
            }], theme: [{
                type: Input
            }], modules: [{
                type: Input
            }], debug: [{
                type: Input
            }], readOnly: [{
                type: Input
            }], placeholder: [{
                type: Input
            }], maxLength: [{
                type: Input
            }], minLength: [{
                type: Input
            }], required: [{
                type: Input
            }], formats: [{
                type: Input
            }], customToolbarPosition: [{
                type: Input
            }], sanitize: [{
                type: Input
            }], styles: [{
                type: Input
            }], strict: [{
                type: Input
            }], scrollingContainer: [{
                type: Input
            }], bounds: [{
                type: Input
            }], customOptions: [{
                type: Input
            }], customModules: [{
                type: Input
            }], trackChanges: [{
                type: Input
            }], preserveWhitespace: [{
                type: Input
            }], classes: [{
                type: Input
            }], trimOnValidation: [{
                type: Input
            }], linkPlaceholder: [{
                type: Input
            }], compareValues: [{
                type: Input
            }], filterNull: [{
                type: Input
            }], debounceTime: [{
                type: Input
            }], defaultEmptyValue: [{
                type: Input
            }], onEditorCreated: [{
                type: Output
            }], onEditorChanged: [{
                type: Output
            }], onContentChanged: [{
                type: Output
            }], onSelectionChanged: [{
                type: Output
            }], onFocus: [{
                type: Output
            }], onBlur: [{
                type: Output
            }], valueGetter: [{
                type: Input
            }], valueSetter: [{
                type: Input
            }] } });
export class QuillEditorComponent extends QuillEditorBase {
    constructor(injector, elementRef, cd, domSanitizer, platformId, renderer, zone, service) {
        super(injector, elementRef, cd, domSanitizer, platformId, renderer, zone, service);
    }
}
QuillEditorComponent.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.0.0", ngImport: i0, type: QuillEditorComponent, deps: [{ token: i0.Injector }, { token: ElementRef }, { token: ChangeDetectorRef }, { token: DomSanitizer }, { token: PLATFORM_ID }, { token: Renderer2 }, { token: NgZone }, { token: QuillService }], target: i0.ɵɵFactoryTarget.Component });
QuillEditorComponent.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "12.0.0", version: "13.0.0", type: QuillEditorComponent, selector: "quill-editor", providers: [
        {
            multi: true,
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => QuillEditorComponent)
        },
        {
            multi: true,
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => QuillEditorComponent)
        }
    ], usesInheritance: true, ngImport: i0, template: `
  <ng-content select="[quill-editor-toolbar]"></ng-content>
`, isInline: true, styles: [":host{display:inline-block}\n"], encapsulation: i0.ViewEncapsulation.None });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.0.0", ngImport: i0, type: QuillEditorComponent, decorators: [{
            type: Component,
            args: [{
                    encapsulation: ViewEncapsulation.None,
                    providers: [
                        {
                            multi: true,
                            provide: NG_VALUE_ACCESSOR,
                            // eslint-disable-next-line @typescript-eslint/no-use-before-define
                            useExisting: forwardRef(() => QuillEditorComponent)
                        },
                        {
                            multi: true,
                            provide: NG_VALIDATORS,
                            // eslint-disable-next-line @typescript-eslint/no-use-before-define
                            useExisting: forwardRef(() => QuillEditorComponent)
                        }
                    ],
                    selector: 'quill-editor',
                    template: `
  <ng-content select="[quill-editor-toolbar]"></ng-content>
`,
                    styles: [
                        `
    :host {
      display: inline-block;
    }
    `
                    ]
                }]
        }], ctorParameters: function () { return [{ type: i0.Injector }, { type: i0.ElementRef, decorators: [{
                    type: Inject,
                    args: [ElementRef]
                }] }, { type: i0.ChangeDetectorRef, decorators: [{
                    type: Inject,
                    args: [ChangeDetectorRef]
                }] }, { type: i1.DomSanitizer, decorators: [{
                    type: Inject,
                    args: [DomSanitizer]
                }] }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }, { type: i0.Renderer2, decorators: [{
                    type: Inject,
                    args: [Renderer2]
                }] }, { type: i0.NgZone, decorators: [{
                    type: Inject,
                    args: [NgZone]
                }] }, { type: i2.QuillService, decorators: [{
                    type: Inject,
                    args: [QuillService]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpbGwtZWRpdG9yLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL25neC1xdWlsbC9zcmMvbGliL3F1aWxsLWVkaXRvci5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQU14RCxPQUFPLEVBRUwsaUJBQWlCLEVBQ2pCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsVUFBVSxFQUNWLFlBQVksRUFDWixVQUFVLEVBQ1YsTUFBTSxFQUVOLEtBQUssRUFDTCxNQUFNLEVBR04sTUFBTSxFQUNOLFdBQVcsRUFDWCxTQUFTLEVBQ1QsZUFBZSxFQUVmLGlCQUFpQixFQUNsQixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUM5QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFN0MsT0FBTyxFQUF3QixhQUFhLEVBQUUsaUJBQWlCLEVBQWEsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFakQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUE7Ozs7QUFzQzlDLGtFQUFrRTtBQUNsRSxNQUFNLE9BQWdCLGVBQWU7SUE2RG5DLFlBQ0UsUUFBa0IsRUFDWCxVQUFzQixFQUNuQixFQUFxQixFQUNyQixZQUEwQixFQUNMLFVBQWUsRUFDcEMsUUFBbUIsRUFDbkIsSUFBWSxFQUNaLE9BQXFCO1FBTnhCLGVBQVUsR0FBVixVQUFVLENBQVk7UUFDbkIsT0FBRSxHQUFGLEVBQUUs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bUU7NEJBQ25FLFdBQVcsRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLHFCQUFxQixDQUFDO3lCQUNwRDt3QkFDRDs0QkFDRSxLQUFLLEVBQUUsSUFBSTs0QkFDWCxPQUFPLEVBQUUsYUFBYTs0QkFDdEIsbUVBQW1FOzRCQUNuRSxXQUFXLEVBQUUsVUFBVSxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsQ0FBQzt5QkFDcEQ7cUJBQ0Y7b0JBQ0QsUUFBUSxFQUFFLGNBQWM7b0JBQ3hCLFFBQVEsRUFBRTs7Q0FFWDtvQkFDQyxNQUFNLEVBQUU7d0JBQ047Ozs7S0FJQztxQkFDRjtpQkFDRjs7MEJBS0ksTUFBTTsyQkFBQyxVQUFVOzswQkFDakIsTUFBTTsyQkFBQyxpQkFBaUI7OzBCQUN4QixNQUFNOzJCQUFDLFlBQVk7OzBCQUNuQixNQUFNOzJCQUFDLFdBQVc7OzBCQUNsQixNQUFNOzJCQUFDLFNBQVM7OzBCQUNoQixNQUFNOzJCQUFDLE1BQU07OzBCQUNiLE1BQU07MkJBQUMsWUFBWSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERPQ1VNRU5ULCBpc1BsYXRmb3JtU2VydmVyIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJ1xuaW1wb3J0IHsgRG9tU2FuaXRpemVyIH0gZnJvbSAnQGFuZ3VsYXIvcGxhdGZvcm0tYnJvd3NlcidcblxuaW1wb3J0IHsgUXVpbGxNb2R1bGVzLCBDdXN0b21PcHRpb24sIEN1c3RvbU1vZHVsZSB9IGZyb20gJy4vcXVpbGwtZWRpdG9yLmludGVyZmFjZXMnXG5cbmltcG9ydCBRdWlsbFR5cGUsIHsgRGVsdGEgfSBmcm9tICdxdWlsbCdcblxuaW1wb3J0IHtcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIENvbXBvbmVudCxcbiAgRGlyZWN0aXZlLFxuICBFbGVtZW50UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIGZvcndhcmRSZWYsXG4gIEluamVjdCxcbiAgSW5qZWN0b3IsXG4gIElucHV0LFxuICBOZ1pvbmUsXG4gIE9uQ2hhbmdlcyxcbiAgT25EZXN0cm95LFxuICBPdXRwdXQsXG4gIFBMQVRGT1JNX0lELFxuICBSZW5kZXJlcjIsXG4gIFNlY3VyaXR5Q29udGV4dCxcbiAgU2ltcGxlQ2hhbmdlcyxcbiAgVmlld0VuY2Fwc3VsYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSdcbmltcG9ydCB7IGZyb21FdmVudCwgU3Vic2NyaXB0aW9uIH0gZnJvbSAncnhqcydcbmltcG9ydCB7IGRlYm91bmNlVGltZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJ1xuXG5pbXBvcnQgeyBDb250cm9sVmFsdWVBY2Nlc3NvciwgTkdfVkFMSURBVE9SUywgTkdfVkFMVUVfQUNDRVNTT1IsIFZhbGlkYXRvciB9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJ1xuaW1wb3J0IHsgZGVmYXVsdE1vZHVsZXMgfSBmcm9tICcuL3F1aWxsLWRlZmF1bHRzJ1xuXG5pbXBvcnQgeyBnZXRGb3JtYXQgfSBmcm9tICcuL2hlbHBlcnMnXG5pbXBvcnQgeyBRdWlsbFNlcnZpY2UgfSBmcm9tICcuL3F1aWxsLnNlcnZpY2UnXG5cbmV4cG9ydCBpbnRlcmZhY2UgUmFuZ2Uge1xuICBpbmRleDogbnVtYmVyXG4gIGxlbmd0aDogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29udGVudENoYW5nZSB7XG4gIGNvbnRlbnQ6IGFueVxuICBkZWx0YTogRGVsdGFcbiAgZWRpdG9yOiBRdWlsbFR5cGVcbiAgaHRtbDogc3RyaW5nIHwgbnVsbFxuICBvbGREZWx0YTogRGVsdGFcbiAgc291cmNlOiBzdHJpbmdcbiAgdGV4dDogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0aW9uQ2hhbmdlIHtcbiAgZWRpdG9yOiBRdWlsbFR5cGVcbiAgb2xkUmFuZ2U6IFJhbmdlIHwgbnVsbFxuICByYW5nZTogUmFuZ2UgfCBudWxsXG4gIHNvdXJjZTogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQmx1ciB7XG4gIGVkaXRvcjogUXVpbGxUeXBlXG4gIHNvdXJjZTogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9jdXMge1xuICBlZGl0b3I6IFF1aWxsVHlwZVxuICBzb3VyY2U6IHN0cmluZ1xufVxuXG5leHBvcnQgdHlwZSBFZGl0b3JDaGFuZ2VDb250ZW50ID0gQ29udGVudENoYW5nZSAmIHsgZXZlbnQ6ICd0ZXh0LWNoYW5nZScgfVxuZXhwb3J0IHR5cGUgRWRpdG9yQ2hhbmdlU2VsZWN0aW9uID0gU2VsZWN0aW9uQ2hhbmdlICYgeyBldmVudDogJ3NlbGVjdGlvbi1jaGFuZ2UnIH1cblxuQERpcmVjdGl2ZSgpXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGFuZ3VsYXItZXNsaW50L2RpcmVjdGl2ZS1jbGFzcy1zdWZmaXhcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBRdWlsbEVkaXRvckJhc2UgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBDb250cm9sVmFsdWVBY2Nlc3NvciwgT25DaGFuZ2VzLCBPbkRlc3Ryb3ksIFZhbGlkYXRvciB7XG4gIEBJbnB1dCgpIGZvcm1hdD86ICdvYmplY3QnIHwgJ2h0bWwnIHwgJ3RleHQnIHwgJ2pzb24nXG4gIEBJbnB1dCgpIHRoZW1lPzogc3RyaW5nXG4gIEBJbnB1dCgpIG1vZHVsZXM/OiBRdWlsbE1vZHVsZXNcbiAgQElucHV0KCkgZGVidWc/OiAnd2FybicgfCAnbG9nJyB8ICdlcnJvcicgfCBmYWxzZVxuICBASW5wdXQoKSByZWFkT25seT86IGJvb2xlYW5cbiAgQElucHV0KCkgcGxhY2Vob2xkZXI/OiBzdHJpbmdcbiAgQElucHV0KCkgbWF4TGVuZ3RoPzogbnVtYmVyXG4gIEBJbnB1dCgpIG1pbkxlbmd0aD86IG51bWJlclxuICBASW5wdXQoKSByZXF1aXJlZCA9IGZhbHNlXG4gIEBJbnB1dCgpIGZvcm1hdHM/OiBzdHJpbmdbXSB8IG51bGxcbiAgQElucHV0KCkgY3VzdG9tVG9vbGJhclBvc2l0aW9uOiAndG9wJyB8ICdib3R0b20nID0gJ3RvcCdcbiAgQElucHV0KCkgc2FuaXRpemUgPSBmYWxzZVxuICBASW5wdXQoKSBzdHlsZXM6IGFueSA9IG51bGxcbiAgQElucHV0KCkgc3RyaWN0ID0gdHJ1ZVxuICBASW5wdXQoKSBzY3JvbGxpbmdDb250YWluZXI/OiBIVE1MRWxlbWVudCB8IHN0cmluZyB8IG51bGxcbiAgQElucHV0KCkgYm91bmRzPzogSFRNTEVsZW1lbnQgfCBzdHJpbmdcbiAgQElucHV0KCkgY3VzdG9tT3B0aW9uczogQ3VzdG9tT3B0aW9uW10gPSBbXVxuICBASW5wdXQoKSBjdXN0b21Nb2R1bGVzOiBDdXN0b21Nb2R1bGVbXSA9IFtdXG4gIEBJbnB1dCgpIHRyYWNrQ2hhbmdlcz86ICd1c2VyJyB8ICdhbGwnXG4gIEBJbnB1dCgpIHByZXNlcnZlV2hpdGVzcGFjZSA9IGZhbHNlXG4gIEBJbnB1dCgpIGNsYXNzZXM/OiBzdHJpbmdcbiAgQElucHV0KCkgdHJpbU9uVmFsaWRhdGlvbiA9IGZhbHNlXG4gIEBJbnB1dCgpIGxpbmtQbGFjZWhvbGRlcj86IHN0cmluZ1xuICBASW5wdXQoKSBjb21wYXJlVmFsdWVzID0gZmFsc2VcbiAgQElucHV0KCkgZmlsdGVyTnVsbCA9IGZhbHNlXG4gIEBJbnB1dCgpIGRlYm91bmNlVGltZT86IG51bWJlclxuICAvKlxuICBodHRwczovL2dpdGh1Yi5jb20vS2lsbGVyQ29kZU1vbmtleS9uZ3gtcXVpbGwvaXNzdWVzLzEyNTcgLSBmaXggbnVsbCB2YWx1ZSBzZXRcblxuICBwcm92aWRlIGRlZmF1bHQgZW1wdHkgdmFsdWVcbiAgYnkgZGVmYXVsdCBudWxsXG5cbiAgZS5nLiBkZWZhdWx0RW1wdHlWYWx1ZT1cIlwiIC0gZW1wdHkgc3RyaW5nXG5cbiAgPHF1aWxsLWVkaXRvclxuICAgIGRlZmF1bHRFbXB0eVZhbHVlPVwiXCJcbiAgICBmb3JtQ29udHJvbE5hbWU9XCJtZXNzYWdlXCJcbiAgPjwvcXVpbGwtZWRpdG9yPlxuICAqL1xuICBASW5wdXQoKSBkZWZhdWx0RW1wdHlWYWx1ZT86IGFueSA9IG51bGxcblxuICBAT3V0cHV0KCkgb25FZGl0b3JDcmVhdGVkOiBFdmVudEVtaXR0ZXI8YW55PiA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuICBAT3V0cHV0KCkgb25FZGl0b3JDaGFuZ2VkOiBFdmVudEVtaXR0ZXI8RWRpdG9yQ2hhbmdlQ29udGVudCB8IEVkaXRvckNoYW5nZVNlbGVjdGlvbj4gPSBuZXcgRXZlbnRFbWl0dGVyKClcbiAgQE91dHB1dCgpIG9uQ29udGVudENoYW5nZWQ6IEV2ZW50RW1pdHRlcjxDb250ZW50Q2hhbmdlPiA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuICBAT3V0cHV0KCkgb25TZWxlY3Rpb25DaGFuZ2VkOiBFdmVudEVtaXR0ZXI8U2VsZWN0aW9uQ2hhbmdlPiA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuICBAT3V0cHV0KCkgb25Gb2N1czogRXZlbnRFbWl0dGVyPEZvY3VzPiA9IG5ldyBFdmVudEVtaXR0ZXIoKVxuICBAT3V0cHV0KCkgb25CbHVyOiBFdmVudEVtaXR0ZXI8Qmx1cj4gPSBuZXcgRXZlbnRFbWl0dGVyKClcblxuICBxdWlsbEVkaXRvciE6IFF1aWxsVHlwZVxuICBlZGl0b3JFbGVtITogSFRNTEVsZW1lbnRcbiAgY29udGVudDogYW55XG4gIGRpc2FibGVkID0gZmFsc2UgLy8gdXNlZCB0byBzdG9yZSBpbml0aWFsIHZhbHVlIGJlZm9yZSBWaWV3SW5pdFxuXG4gIG9uTW9kZWxDaGFuZ2U6IChtb2RlbFZhbHVlPzogYW55KSA9PiB2b2lkXG4gIG9uTW9kZWxUb3VjaGVkOiAoKSA9PiB2b2lkXG4gIG9uVmFsaWRhdG9yQ2hhbmdlZDogKCkgPT4gdm9pZFxuXG4gIHByaXZhdGUgZG9jdW1lbnQ6IERvY3VtZW50XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb24gfCBudWxsID0gbnVsbFxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGluamVjdG9yOiBJbmplY3RvcixcbiAgICBwdWJsaWMgZWxlbWVudFJlZjogRWxlbWVudFJlZixcbiAgICBwcm90ZWN0ZWQgY2Q6IENoYW5nZURldGVjdG9yUmVmLFxuICAgIHByb3RlY3RlZCBkb21TYW5pdGl6ZXI6IERvbVNhbml0aXplcixcbiAgICBASW5qZWN0KFBMQVRGT1JNX0lEKSBwcm90ZWN0ZWQgcGxhdGZvcm1JZDogYW55LFxuICAgIHByb3RlY3RlZCByZW5kZXJlcjogUmVuZGVyZXIyLFxuICAgIHByb3RlY3RlZCB6b25lOiBOZ1pvbmUsXG4gICAgcHJvdGVjdGVkIHNlcnZpY2U6IFF1aWxsU2VydmljZVxuICApIHtcbiAgICB0aGlzLmRvY3VtZW50ID0gaW5qZWN0b3IuZ2V0KERPQ1VNRU5UKVxuICB9XG5cbiAgc3RhdGljIG5vcm1hbGl6ZUNsYXNzTmFtZXMoY2xhc3Nlczogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGNsYXNzTGlzdCA9IGNsYXNzZXMudHJpbSgpLnNwbGl0KCcgJylcbiAgICByZXR1cm4gY2xhc3NMaXN0LnJlZHVjZSgocHJldjogc3RyaW5nW10sIGN1cjogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCB0cmltbWVkID0gY3VyLnRyaW0oKVxuICAgICAgaWYgKHRyaW1tZWQpIHtcbiAgICAgICAgcHJldi5wdXNoKHRyaW1tZWQpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwcmV2XG4gICAgfSwgW10pXG4gIH1cblxuICBASW5wdXQoKVxuICB2YWx1ZUdldHRlciA9IChxdWlsbEVkaXRvcjogUXVpbGxUeXBlLCBlZGl0b3JFbGVtZW50OiBIVE1MRWxlbWVudCk6IHN0cmluZyB8IGFueSA9PiB7XG4gICAgbGV0IGh0bWw6IHN0cmluZyB8IG51bGwgPSBlZGl0b3JFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5xbC1lZGl0b3InKSEuaW5uZXJIVE1MXG4gICAgaWYgKGh0bWwgPT09ICc8cD48YnI+PC9wPicgfHwgaHRtbCA9PT0gJzxkaXY+PGJyPjwvZGl2PicpIHtcbiAgICAgIGh0bWwgPSB0aGlzLmRlZmF1bHRFbXB0eVZhbHVlXG4gICAgfVxuICAgIGxldCBtb2RlbFZhbHVlOiBzdHJpbmcgfCBEZWx0YSB8IG51bGwgPSBodG1sXG4gICAgY29uc3QgZm9ybWF0ID0gZ2V0Rm9ybWF0KHRoaXMuZm9ybWF0LCB0aGlzLnNlcnZpY2UuY29uZmlnLmZvcm1hdClcblxuICAgIGlmIChmb3JtYXQgPT09ICd0ZXh0Jykge1xuICAgICAgbW9kZWxWYWx1ZSA9IHF1aWxsRWRpdG9yLmdldFRleHQoKVxuICAgIH0gZWxzZSBpZiAoZm9ybWF0ID09PSAnb2JqZWN0Jykge1xuICAgICAgbW9kZWxWYWx1ZSA9IHF1aWxsRWRpdG9yLmdldENvbnRlbnRzKClcbiAgICB9IGVsc2UgaWYgKGZvcm1hdCA9PT0gJ2pzb24nKSB7XG4gICAgICB0cnkge1xuICAgICAgICBtb2RlbFZhbHVlID0gSlNPTi5zdHJpbmdpZnkocXVpbGxFZGl0b3IuZ2V0Q29udGVudHMoKSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbW9kZWxWYWx1ZSA9IHF1aWxsRWRpdG9yLmdldFRleHQoKVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtb2RlbFZhbHVlXG4gIH1cblxuICBASW5wdXQoKVxuICB2YWx1ZVNldHRlciA9IChxdWlsbEVkaXRvcjogUXVpbGxUeXBlLCB2YWx1ZTogYW55KTogYW55ID0+IHtcbiAgICBjb25zdCBmb3JtYXQgPSBnZXRGb3JtYXQodGhpcy5mb3JtYXQsIHRoaXMuc2VydmljZS5jb25maWcuZm9ybWF0KVxuICAgIGlmIChmb3JtYXQgPT09ICdodG1sJykge1xuICAgICAgaWYgKHRoaXMuc2FuaXRpemUpIHtcbiAgICAgICAgdmFsdWUgPSB0aGlzLmRvbVNhbml0aXplci5zYW5pdGl6ZShTZWN1cml0eUNvbnRleHQuSFRNTCwgdmFsdWUpXG4gICAgICB9XG4gICAgICByZXR1cm4gcXVpbGxFZGl0b3IuY2xpcGJvYXJkLmNvbnZlcnQodmFsdWUpXG4gICAgfSBlbHNlIGlmIChmb3JtYXQgPT09ICdqc29uJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodmFsdWUpXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBbeyBpbnNlcnQ6IHZhbHVlIH1dXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICBhc3luYyBuZ0FmdGVyVmlld0luaXQoKSB7XG4gICAgaWYgKGlzUGxhdGZvcm1TZXJ2ZXIodGhpcy5wbGF0Zm9ybUlkKSkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uYW1pbmctY29udmVudGlvblxuICAgIGNvbnN0IFF1aWxsID0gYXdhaXQgdGhpcy5zZXJ2aWNlLmdldFF1aWxsKClcblxuICAgIHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50Lmluc2VydEFkamFjZW50SFRNTChcbiAgICAgIHRoaXMuY3VzdG9tVG9vbGJhclBvc2l0aW9uID09PSAndG9wJyA/ICdiZWZvcmVlbmQnIDogJ2FmdGVyYmVnaW4nLFxuICAgICAgdGhpcy5wcmVzZXJ2ZVdoaXRlc3BhY2UgPyAnPHByZSBxdWlsbC1lZGl0b3ItZWxlbWVudD48L3ByZT4nIDogJzxkaXYgcXVpbGwtZWRpdG9yLWVsZW1lbnQ+PC9kaXY+J1xuICAgIClcblxuICAgIHRoaXMuZWRpdG9yRWxlbSA9IHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAnW3F1aWxsLWVkaXRvci1lbGVtZW50XSdcbiAgICApXG5cbiAgICBjb25zdCB0b29sYmFyRWxlbSA9IHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXG4gICAgICAnW3F1aWxsLWVkaXRvci10b29sYmFyXSdcbiAgICApXG4gICAgY29uc3QgbW9kdWxlcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMubW9kdWxlcyB8fCB0aGlzLnNlcnZpY2UuY29uZmlnLm1vZHVsZXMpXG5cbiAgICBpZiAodG9vbGJhckVsZW0pIHtcbiAgICAgIG1vZHVsZXMudG9vbGJhciA9IHRvb2xiYXJFbGVtXG4gICAgfSBlbHNlIGlmIChtb2R1bGVzLnRvb2xiYXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbW9kdWxlcy50b29sYmFyID0gZGVmYXVsdE1vZHVsZXMudG9vbGJhclxuICAgIH1cblxuICAgIGxldCBwbGFjZWhvbGRlciA9IHRoaXMucGxhY2Vob2xkZXIgIT09IHVuZGVmaW5lZCA/IHRoaXMucGxhY2Vob2xkZXIgOiB0aGlzLnNlcnZpY2UuY29uZmlnLnBsYWNlaG9sZGVyXG4gICAgaWYgKHBsYWNlaG9sZGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHBsYWNlaG9sZGVyID0gJ0luc2VydCB0ZXh0IGhlcmUgLi4uJ1xuICAgIH1cblxuICAgIGlmICh0aGlzLnN0eWxlcykge1xuICAgICAgT2JqZWN0LmtleXModGhpcy5zdHlsZXMpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiB7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUodGhpcy5lZGl0b3JFbGVtLCBrZXksIHRoaXMuc3R5bGVzW2tleV0pXG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmICh0aGlzLmNsYXNzZXMpIHtcbiAgICAgIHRoaXMuYWRkQ2xhc3Nlcyh0aGlzLmNsYXNzZXMpXG4gICAgfVxuXG4gICAgdGhpcy5jdXN0b21PcHRpb25zLmZvckVhY2goKGN1c3RvbU9wdGlvbikgPT4ge1xuICAgICAgY29uc3QgbmV3Q3VzdG9tT3B0aW9uID0gUXVpbGwuaW1wb3J0KGN1c3RvbU9wdGlvbi5pbXBvcnQpXG4gICAgICBuZXdDdXN0b21PcHRpb24ud2hpdGVsaXN0ID0gY3VzdG9tT3B0aW9uLndoaXRlbGlzdFxuICAgICAgUXVpbGwucmVnaXN0ZXIobmV3Q3VzdG9tT3B0aW9uLCB0cnVlKVxuICAgIH0pXG5cbiAgICB0aGlzLmN1c3RvbU1vZHVsZXMuZm9yRWFjaCgoeyBpbXBsZW1lbnRhdGlvbiwgcGF0aCB9KSA9PiB7XG4gICAgICBRdWlsbC5yZWdpc3RlcihwYXRoLCBpbXBsZW1lbnRhdGlvbilcbiAgICB9KVxuXG4gICAgbGV0IGJvdW5kcyA9IHRoaXMuYm91bmRzICYmIHRoaXMuYm91bmRzID09PSAnc2VsZicgPyB0aGlzLmVkaXRvckVsZW0gOiB0aGlzLmJvdW5kc1xuICAgIGlmICghYm91bmRzKSB7XG4gICAgICBib3VuZHMgPSB0aGlzLnNlcnZpY2UuY29uZmlnLmJvdW5kcyA/IHRoaXMuc2VydmljZS5jb25maWcuYm91bmRzIDogdGhpcy5kb2N1bWVudC5ib2R5XG4gICAgfVxuXG4gICAgbGV0IGRlYnVnID0gdGhpcy5kZWJ1Z1xuICAgIGlmICghZGVidWcgJiYgZGVidWcgIT09IGZhbHNlICYmIHRoaXMuc2VydmljZS5jb25maWcuZGVidWcpIHtcbiAgICAgIGRlYnVnID0gdGhpcy5zZXJ2aWNlLmNvbmZpZy5kZWJ1Z1xuICAgIH1cblxuICAgIGxldCByZWFkT25seSA9IHRoaXMucmVhZE9ubHlcbiAgICBpZiAoIXJlYWRPbmx5ICYmIHRoaXMucmVhZE9ubHkgIT09IGZhbHNlKSB7XG4gICAgICByZWFkT25seSA9IHRoaXMuc2VydmljZS5jb25maWcucmVhZE9ubHkgIT09IHVuZGVmaW5lZCA/IHRoaXMuc2VydmljZS5jb25maWcucmVhZE9ubHkgOiBmYWxzZVxuICAgIH1cblxuICAgIGxldCBkZWZhdWx0RW1wdHlWYWx1ZSA9IHRoaXMuZGVmYXVsdEVtcHR5VmFsdWVcbiAgICBpZiAodGhpcy5zZXJ2aWNlLmNvbmZpZy5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdEVtcHR5VmFsdWUnKSkge1xuICAgICAgZGVmYXVsdEVtcHR5VmFsdWUgPSB0aGlzLnNlcnZpY2UuY29uZmlnLmRlZmF1bHRFbXB0eVZhbHVlXG4gICAgfVxuXG4gICAgbGV0IHNjcm9sbGluZ0NvbnRhaW5lciA9IHRoaXMuc2Nyb2xsaW5nQ29udGFpbmVyXG4gICAgaWYgKCFzY3JvbGxpbmdDb250YWluZXIgJiYgdGhpcy5zY3JvbGxpbmdDb250YWluZXIgIT09IG51bGwpIHtcbiAgICAgIHNjcm9sbGluZ0NvbnRhaW5lciA9XG4gICAgICAgIHRoaXMuc2VydmljZS5jb25maWcuc2Nyb2xsaW5nQ29udGFpbmVyID09PSBudWxsXG4gICAgICAgICAgfHwgdGhpcy5zZXJ2aWNlLmNvbmZpZy5zY3JvbGxpbmdDb250YWluZXIgPyB0aGlzLnNlcnZpY2UuY29uZmlnLnNjcm9sbGluZ0NvbnRhaW5lciA6IG51bGxcbiAgICB9XG5cbiAgICBsZXQgZm9ybWF0cyA9IHRoaXMuZm9ybWF0c1xuICAgIGlmICghZm9ybWF0cyAmJiBmb3JtYXRzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvcm1hdHMgPSB0aGlzLnNlcnZpY2UuY29uZmlnLmZvcm1hdHMgPyBbLi4udGhpcy5zZXJ2aWNlLmNvbmZpZy5mb3JtYXRzXSA6ICh0aGlzLnNlcnZpY2UuY29uZmlnLmZvcm1hdHMgPT09IG51bGwgPyBudWxsIDogdW5kZWZpbmVkKVxuICAgIH1cblxuICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICB0aGlzLnF1aWxsRWRpdG9yID0gbmV3IFF1aWxsKHRoaXMuZWRpdG9yRWxlbSwge1xuICAgICAgICBib3VuZHMsXG4gICAgICAgIGRlYnVnOiBkZWJ1ZyBhcyBhbnksXG4gICAgICAgIGZvcm1hdHM6IGZvcm1hdHMgYXMgYW55LFxuICAgICAgICBtb2R1bGVzLFxuICAgICAgICBwbGFjZWhvbGRlcixcbiAgICAgICAgcmVhZE9ubHksXG4gICAgICAgIGRlZmF1bHRFbXB0eVZhbHVlLFxuICAgICAgICBzY3JvbGxpbmdDb250YWluZXI6IHNjcm9sbGluZ0NvbnRhaW5lciBhcyBhbnksXG4gICAgICAgIHN0cmljdDogdGhpcy5zdHJpY3QsXG4gICAgICAgIHRoZW1lOiB0aGlzLnRoZW1lIHx8ICh0aGlzLnNlcnZpY2UuY29uZmlnLnRoZW1lID8gdGhpcy5zZXJ2aWNlLmNvbmZpZy50aGVtZSA6ICdzbm93JylcbiAgICAgIH0pXG5cbiAgICAgIC8vIFNldCBvcHRpb25hbCBsaW5rIHBsYWNlaG9sZGVyLCBRdWlsbCBoYXMgbm8gbmF0aXZlIEFQSSBmb3IgaXQgc28gdXNpbmcgd29ya2Fyb3VuZFxuICAgICAgaWYgKHRoaXMubGlua1BsYWNlaG9sZGVyKSB7XG4gICAgICAgIGNvbnN0IHRvb2x0aXAgPSAodGhpcy5xdWlsbEVkaXRvciBhcyBhbnkpPy50aGVtZT8udG9vbHRpcFxuICAgICAgICBjb25zdCBpbnB1dCA9IHRvb2x0aXA/LnJvb3Q/LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W2RhdGEtbGlua10nKVxuICAgICAgICBpZiAoaW5wdXQ/LmRhdGFzZXQpIHtcbiAgICAgICAgICBpbnB1dC5kYXRhc2V0LmxpbmsgPSB0aGlzLmxpbmtQbGFjZWhvbGRlclxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcblxuICAgIGlmICh0aGlzLmNvbnRlbnQpIHtcbiAgICAgIGNvbnN0IGZvcm1hdCA9IGdldEZvcm1hdCh0aGlzLmZvcm1hdCwgdGhpcy5zZXJ2aWNlLmNvbmZpZy5mb3JtYXQpXG5cbiAgICAgIGlmIChmb3JtYXQgPT09ICd0ZXh0Jykge1xuICAgICAgICB0aGlzLnF1aWxsRWRpdG9yLnNldFRleHQodGhpcy5jb250ZW50LCAnc2lsZW50JylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpcy52YWx1ZVNldHRlcih0aGlzLnF1aWxsRWRpdG9yLCB0aGlzLmNvbnRlbnQpXG4gICAgICAgIHRoaXMucXVpbGxFZGl0b3Iuc2V0Q29udGVudHMobmV3VmFsdWUsICdzaWxlbnQnKVxuICAgICAgfVxuXG4gICAgICB0aGlzLnF1aWxsRWRpdG9yLmdldE1vZHVsZSgnaGlzdG9yeScpLmNsZWFyKClcbiAgICB9XG5cbiAgICAvLyBpbml0aWFsaXplIGRpc2FibGVkIHN0YXR1cyBiYXNlZCBvbiB0aGlzLmRpc2FibGVkIGFzIGRlZmF1bHQgdmFsdWVcbiAgICB0aGlzLnNldERpc2FibGVkU3RhdGUoKVxuXG4gICAgdGhpcy5hZGRRdWlsbEV2ZW50TGlzdGVuZXJzKClcblxuICAgIC8vIFRoZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0cmlnZ2VycyBjaGFuZ2UgZGV0ZWN0aW9uLiBUaGVyZSdzIG5vIHNlbnNlIHRvIGludm9rZSB0aGUgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgaWYgYW55b25lIGlzXG4gICAgLy8gbGlzdGVuaW5nIHRvIHRoZSBgb25FZGl0b3JDcmVhdGVkYCBldmVudCBpbnNpZGUgdGhlIHRlbXBsYXRlLCBmb3IgaW5zdGFuY2UgYDxxdWlsbC12aWV3IChvbkVkaXRvckNyZWF0ZWQpPVwiLi4uXCI+YC5cbiAgICBpZiAoIXRoaXMub25FZGl0b3JDcmVhdGVkLm9ic2VydmVycy5sZW5ndGggJiYgIXRoaXMub25WYWxpZGF0b3JDaGFuZ2VkKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBUaGUgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgd2lsbCB0cmlnZ2VyIGNoYW5nZSBkZXRlY3Rpb24gYW5kIGBvbkVkaXRvckNyZWF0ZWRgIHdpbGwgYWxzbyBjYWxsIGBtYXJrRGlydHkoKWBcbiAgICAvLyBpbnRlcm5hbGx5LCBzaW5jZSBBbmd1bGFyIHdyYXBzIHRlbXBsYXRlIGV2ZW50IGxpc3RlbmVycyBpbnRvIGBsaXN0ZW5lcmAgaW5zdHJ1Y3Rpb24uIFdlJ3JlIHVzaW5nIHRoZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYFxuICAgIC8vIHRvIHByZXZlbnQgdGhlIGZyYW1lIGRyb3AgYW5kIGF2b2lkIGBFeHByZXNzaW9uQ2hhbmdlZEFmdGVySXRIYXNCZWVuQ2hlY2tlZEVycm9yYCBlcnJvci5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMub25WYWxpZGF0b3JDaGFuZ2VkKSB7XG4gICAgICAgIHRoaXMub25WYWxpZGF0b3JDaGFuZ2VkKClcbiAgICAgIH1cbiAgICAgIHRoaXMub25FZGl0b3JDcmVhdGVkLmVtaXQodGhpcy5xdWlsbEVkaXRvcilcbiAgICB9KVxuICB9XG5cbiAgc2VsZWN0aW9uQ2hhbmdlSGFuZGxlciA9IChyYW5nZTogUmFuZ2UgfCBudWxsLCBvbGRSYW5nZTogUmFuZ2UgfCBudWxsLCBzb3VyY2U6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHNob3VsZFRyaWdnZXJPbk1vZGVsVG91Y2hlZCA9ICFyYW5nZSAmJiAhIXRoaXMub25Nb2RlbFRvdWNoZWRcblxuICAgIC8vIG9ubHkgZW1pdCBjaGFuZ2VzIHdoZW4gdGhlcmUncyBhbnkgbGlzdGVuZXJcbiAgICBpZiAoIXRoaXMub25CbHVyLm9ic2VydmVycy5sZW5ndGggJiZcbiAgICAgICF0aGlzLm9uRm9jdXMub2JzZXJ2ZXJzLmxlbmd0aCAmJlxuICAgICAgIXRoaXMub25TZWxlY3Rpb25DaGFuZ2VkLm9ic2VydmVycy5sZW5ndGggJiZcbiAgICAgICFzaG91bGRUcmlnZ2VyT25Nb2RlbFRvdWNoZWQpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuem9uZS5ydW4oKCkgPT4ge1xuICAgICAgaWYgKHJhbmdlID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMub25CbHVyLmVtaXQoe1xuICAgICAgICAgIGVkaXRvcjogdGhpcy5xdWlsbEVkaXRvcixcbiAgICAgICAgICBzb3VyY2VcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSBpZiAob2xkUmFuZ2UgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5vbkZvY3VzLmVtaXQoe1xuICAgICAgICAgIGVkaXRvcjogdGhpcy5xdWlsbEVkaXRvcixcbiAgICAgICAgICBzb3VyY2VcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5vblNlbGVjdGlvbkNoYW5nZWQuZW1pdCh7XG4gICAgICAgIGVkaXRvcjogdGhpcy5xdWlsbEVkaXRvcixcbiAgICAgICAgb2xkUmFuZ2UsXG4gICAgICAgIHJhbmdlLFxuICAgICAgICBzb3VyY2VcbiAgICAgIH0pXG5cbiAgICAgIGlmIChzaG91bGRUcmlnZ2VyT25Nb2RlbFRvdWNoZWQpIHtcbiAgICAgICAgdGhpcy5vbk1vZGVsVG91Y2hlZCgpXG4gICAgICB9XG5cbiAgICAgIHRoaXMuY2QubWFya0ZvckNoZWNrKClcbiAgICB9KVxuICB9XG5cbiAgdGV4dENoYW5nZUhhbmRsZXIgPSAoZGVsdGE6IERlbHRhLCBvbGREZWx0YTogRGVsdGEsIHNvdXJjZTogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgLy8gb25seSBlbWl0IGNoYW5nZXMgZW1pdHRlZCBieSB1c2VyIGludGVyYWN0aW9uc1xuICAgIGNvbnN0IHRleHQgPSB0aGlzLnF1aWxsRWRpdG9yLmdldFRleHQoKVxuICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLnF1aWxsRWRpdG9yLmdldENvbnRlbnRzKClcblxuICAgIGxldCBodG1sOiBzdHJpbmcgfCBudWxsID0gdGhpcy5lZGl0b3JFbGVtIS5xdWVyeVNlbGVjdG9yKCcucWwtZWRpdG9yJykhLmlubmVySFRNTFxuICAgIGlmIChodG1sID09PSAnPHA+PGJyPjwvcD4nIHx8IGh0bWwgPT09ICc8ZGl2Pjxicj48L2Rpdj4nKSB7XG4gICAgICBodG1sID0gdGhpcy5kZWZhdWx0RW1wdHlWYWx1ZVxuICAgIH1cblxuICAgIGNvbnN0IHRyYWNrQ2hhbmdlcyA9IHRoaXMudHJhY2tDaGFuZ2VzIHx8IHRoaXMuc2VydmljZS5jb25maWcudHJhY2tDaGFuZ2VzXG4gICAgY29uc3Qgc2hvdWxkVHJpZ2dlck9uTW9kZWxDaGFuZ2UgPSAoc291cmNlID09PSAndXNlcicgfHwgdHJhY2tDaGFuZ2VzICYmIHRyYWNrQ2hhbmdlcyA9PT0gJ2FsbCcpICYmICEhdGhpcy5vbk1vZGVsQ2hhbmdlXG5cbiAgICAvLyBvbmx5IGVtaXQgY2hhbmdlcyB3aGVuIHRoZXJlJ3MgYW55IGxpc3RlbmVyXG4gICAgaWYgKCF0aGlzLm9uQ29udGVudENoYW5nZWQub2JzZXJ2ZXJzLmxlbmd0aCAmJiAhc2hvdWxkVHJpZ2dlck9uTW9kZWxDaGFuZ2UpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuem9uZS5ydW4oKCkgPT4ge1xuICAgICAgaWYgKHNob3VsZFRyaWdnZXJPbk1vZGVsQ2hhbmdlKSB7XG4gICAgICAgIHRoaXMub25Nb2RlbENoYW5nZShcbiAgICAgICAgICB0aGlzLnZhbHVlR2V0dGVyKHRoaXMucXVpbGxFZGl0b3IsIHRoaXMuZWRpdG9yRWxlbSEpXG4gICAgICAgIClcbiAgICAgIH1cblxuICAgICAgdGhpcy5vbkNvbnRlbnRDaGFuZ2VkLmVtaXQoe1xuICAgICAgICBjb250ZW50LFxuICAgICAgICBkZWx0YSxcbiAgICAgICAgZWRpdG9yOiB0aGlzLnF1aWxsRWRpdG9yLFxuICAgICAgICBodG1sLFxuICAgICAgICBvbGREZWx0YSxcbiAgICAgICAgc291cmNlLFxuICAgICAgICB0ZXh0XG4gICAgICB9KVxuXG4gICAgICB0aGlzLmNkLm1hcmtGb3JDaGVjaygpXG4gICAgfSlcbiAgfVxuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gIGVkaXRvckNoYW5nZUhhbmRsZXIgPSAoXG4gICAgZXZlbnQ6ICd0ZXh0LWNoYW5nZScgfCAnc2VsZWN0aW9uLWNoYW5nZScsXG4gICAgY3VycmVudDogYW55IHwgUmFuZ2UgfCBudWxsLCBvbGQ6IGFueSB8IFJhbmdlIHwgbnVsbCwgc291cmNlOiBzdHJpbmdcbiAgKTogdm9pZCA9PiB7XG4gICAgLy8gb25seSBlbWl0IGNoYW5nZXMgd2hlbiB0aGVyZSdzIGFueSBsaXN0ZW5lclxuICAgIGlmICghdGhpcy5vbkVkaXRvckNoYW5nZWQub2JzZXJ2ZXJzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gb25seSBlbWl0IGNoYW5nZXMgZW1pdHRlZCBieSB1c2VyIGludGVyYWN0aW9uc1xuICAgIGlmIChldmVudCA9PT0gJ3RleHQtY2hhbmdlJykge1xuICAgICAgY29uc3QgdGV4dCA9IHRoaXMucXVpbGxFZGl0b3IuZ2V0VGV4dCgpXG4gICAgICBjb25zdCBjb250ZW50ID0gdGhpcy5xdWlsbEVkaXRvci5nZXRDb250ZW50cygpXG5cbiAgICAgIGxldCBodG1sOiBzdHJpbmcgfCBudWxsID0gdGhpcy5lZGl0b3JFbGVtIS5xdWVyeVNlbGVjdG9yKCcucWwtZWRpdG9yJykhLmlubmVySFRNTFxuICAgICAgaWYgKGh0bWwgPT09ICc8cD48YnI+PC9wPicgfHwgaHRtbCA9PT0gJzxkaXY+PGJyPjwvZGl2PicpIHtcbiAgICAgICAgaHRtbCA9IHRoaXMuZGVmYXVsdEVtcHR5VmFsdWVcbiAgICAgIH1cblxuICAgICAgdGhpcy56b25lLnJ1bigoKSA9PiB7XG4gICAgICAgIHRoaXMub25FZGl0b3JDaGFuZ2VkLmVtaXQoe1xuICAgICAgICAgIGNvbnRlbnQsXG4gICAgICAgICAgZGVsdGE6IGN1cnJlbnQsXG4gICAgICAgICAgZWRpdG9yOiB0aGlzLnF1aWxsRWRpdG9yLFxuICAgICAgICAgIGV2ZW50LFxuICAgICAgICAgIGh0bWwsXG4gICAgICAgICAgb2xkRGVsdGE6IG9sZCxcbiAgICAgICAgICBzb3VyY2UsXG4gICAgICAgICAgdGV4dFxuICAgICAgICB9KVxuXG4gICAgICAgIHRoaXMuY2QubWFya0ZvckNoZWNrKClcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuem9uZS5ydW4oKCkgPT4ge1xuICAgICAgICB0aGlzLm9uRWRpdG9yQ2hhbmdlZC5lbWl0KHtcbiAgICAgICAgICBlZGl0b3I6IHRoaXMucXVpbGxFZGl0b3IsXG4gICAgICAgICAgZXZlbnQsXG4gICAgICAgICAgb2xkUmFuZ2U6IG9sZCxcbiAgICAgICAgICByYW5nZTogY3VycmVudCxcbiAgICAgICAgICBzb3VyY2VcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmNkLm1hcmtGb3JDaGVjaygpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuZGlzcG9zZSgpXG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnF1aWxsRWRpdG9yKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L2RvdC1ub3RhdGlvbiAqL1xuICAgIGlmIChjaGFuZ2VzLnJlYWRPbmx5KSB7XG4gICAgICB0aGlzLnF1aWxsRWRpdG9yLmVuYWJsZSghY2hhbmdlcy5yZWFkT25seS5jdXJyZW50VmFsdWUpXG4gICAgfVxuICAgIGlmIChjaGFuZ2VzLnBsYWNlaG9sZGVyKSB7XG4gICAgICB0aGlzLnF1aWxsRWRpdG9yLnJvb3QuZGF0YXNldC5wbGFjZWhvbGRlciA9XG4gICAgICAgIGNoYW5nZXMucGxhY2Vob2xkZXIuY3VycmVudFZhbHVlXG4gICAgfVxuICAgIGlmIChjaGFuZ2VzLmRlZmF1bHRFbXB0eVZhbHVlKSB7XG4gICAgICB0aGlzLnF1aWxsRWRpdG9yLnJvb3QuZGF0YXNldC5kZWZhdWx0RW1wdHlWYWx1ZSA9XG4gICAgICAgIGNoYW5nZXMuZGVmYXVsdEVtcHR5VmFsdWUuY3VycmVudFZhbHVlXG4gICAgfVxuICAgIGlmIChjaGFuZ2VzLnN0eWxlcykge1xuICAgICAgY29uc3QgY3VycmVudFN0eWxpbmcgPSBjaGFuZ2VzLnN0eWxlcy5jdXJyZW50VmFsdWVcbiAgICAgIGNvbnN0IHByZXZpb3VzU3R5bGluZyA9IGNoYW5nZXMuc3R5bGVzLnByZXZpb3VzVmFsdWVcblxuICAgICAgaWYgKHByZXZpb3VzU3R5bGluZykge1xuICAgICAgICBPYmplY3Qua2V5cyhwcmV2aW91c1N0eWxpbmcpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVTdHlsZSh0aGlzLmVkaXRvckVsZW0sIGtleSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGlmIChjdXJyZW50U3R5bGluZykge1xuICAgICAgICBPYmplY3Qua2V5cyhjdXJyZW50U3R5bGluZykuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKHRoaXMuZWRpdG9yRWxlbSwga2V5LCB0aGlzLnN0eWxlc1trZXldKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2hhbmdlcy5jbGFzc2VzKSB7XG4gICAgICBjb25zdCBjdXJyZW50Q2xhc3NlcyA9IGNoYW5nZXMuY2xhc3Nlcy5jdXJyZW50VmFsdWVcbiAgICAgIGNvbnN0IHByZXZpb3VzQ2xhc3NlcyA9IGNoYW5nZXMuY2xhc3Nlcy5wcmV2aW91c1ZhbHVlXG5cbiAgICAgIGlmIChwcmV2aW91c0NsYXNzZXMpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVDbGFzc2VzKHByZXZpb3VzQ2xhc3NlcylcbiAgICAgIH1cblxuICAgICAgaWYgKGN1cnJlbnRDbGFzc2VzKSB7XG4gICAgICAgIHRoaXMuYWRkQ2xhc3NlcyhjdXJyZW50Q2xhc3NlcylcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gV2UnZCB3YW50IHRvIHJlLWFwcGx5IGV2ZW50IGxpc3RlbmVycyBpZiB0aGUgYGRlYm91bmNlVGltZWAgYmluZGluZyBjaGFuZ2VzIHRvIGFwcGx5IHRoZVxuICAgIC8vIGBkZWJvdW5jZVRpbWVgIG9wZXJhdG9yIG9yIHZpY2UtdmVyc2EgcmVtb3ZlIGl0LlxuICAgIGlmIChjaGFuZ2VzLmRlYm91bmNlVGltZSkge1xuICAgICAgdGhpcy5hZGRRdWlsbEV2ZW50TGlzdGVuZXJzKClcbiAgICB9XG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvZG90LW5vdGF0aW9uICovXG4gIH1cblxuICBhZGRDbGFzc2VzKGNsYXNzTGlzdDogc3RyaW5nKTogdm9pZCB7XG4gICAgUXVpbGxFZGl0b3JCYXNlLm5vcm1hbGl6ZUNsYXNzTmFtZXMoY2xhc3NMaXN0KS5mb3JFYWNoKChjOiBzdHJpbmcpID0+IHtcbiAgICAgIHRoaXMucmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5lZGl0b3JFbGVtLCBjKVxuICAgIH0pXG4gIH1cblxuICByZW1vdmVDbGFzc2VzKGNsYXNzTGlzdDogc3RyaW5nKTogdm9pZCB7XG4gICAgUXVpbGxFZGl0b3JCYXNlLm5vcm1hbGl6ZUNsYXNzTmFtZXMoY2xhc3NMaXN0KS5mb3JFYWNoKChjOiBzdHJpbmcpID0+IHtcbiAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQ2xhc3ModGhpcy5lZGl0b3JFbGVtLCBjKVxuICAgIH0pXG4gIH1cblxuICB3cml0ZVZhbHVlKGN1cnJlbnRWYWx1ZTogYW55KSB7XG5cbiAgICAvLyBvcHRpb25hbCBmaXggZm9yIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXIvaXNzdWVzLzE0OTg4XG4gICAgaWYgKHRoaXMuZmlsdGVyTnVsbCAmJiBjdXJyZW50VmFsdWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuY29udGVudCA9IGN1cnJlbnRWYWx1ZVxuXG4gICAgaWYgKCF0aGlzLnF1aWxsRWRpdG9yKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25zdCBmb3JtYXQgPSBnZXRGb3JtYXQodGhpcy5mb3JtYXQsIHRoaXMuc2VydmljZS5jb25maWcuZm9ybWF0KVxuICAgIGNvbnN0IG5ld1ZhbHVlID0gdGhpcy52YWx1ZVNldHRlcih0aGlzLnF1aWxsRWRpdG9yLCBjdXJyZW50VmFsdWUpXG5cbiAgICBpZiAodGhpcy5jb21wYXJlVmFsdWVzKSB7XG4gICAgICBjb25zdCBjdXJyZW50RWRpdG9yVmFsdWUgPSB0aGlzLnF1aWxsRWRpdG9yLmdldENvbnRlbnRzKClcbiAgICAgIGlmIChKU09OLnN0cmluZ2lmeShjdXJyZW50RWRpdG9yVmFsdWUpID09PSBKU09OLnN0cmluZ2lmeShuZXdWYWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgaWYgKGZvcm1hdCA9PT0gJ3RleHQnKSB7XG4gICAgICAgIHRoaXMucXVpbGxFZGl0b3Iuc2V0VGV4dChjdXJyZW50VmFsdWUpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnF1aWxsRWRpdG9yLnNldENvbnRlbnRzKG5ld1ZhbHVlKVxuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHRoaXMucXVpbGxFZGl0b3Iuc2V0VGV4dCgnJylcblxuICB9XG5cbiAgc2V0RGlzYWJsZWRTdGF0ZShpc0Rpc2FibGVkOiBib29sZWFuID0gdGhpcy5kaXNhYmxlZCk6IHZvaWQge1xuICAgIC8vIHN0b3JlIGluaXRpYWwgdmFsdWUgdG8gc2V0IGFwcHJvcHJpYXRlIGRpc2FibGVkIHN0YXR1cyBhZnRlciBWaWV3SW5pdFxuICAgIHRoaXMuZGlzYWJsZWQgPSBpc0Rpc2FibGVkXG4gICAgaWYgKHRoaXMucXVpbGxFZGl0b3IpIHtcbiAgICAgIGlmIChpc0Rpc2FibGVkKSB7XG4gICAgICAgIHRoaXMucXVpbGxFZGl0b3IuZGlzYWJsZSgpXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0QXR0cmlidXRlKHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LCAnZGlzYWJsZWQnLCAnZGlzYWJsZWQnKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCF0aGlzLnJlYWRPbmx5KSB7XG4gICAgICAgICAgdGhpcy5xdWlsbEVkaXRvci5lbmFibGUoKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVuZGVyZXIucmVtb3ZlQXR0cmlidXRlKHRoaXMuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LCAnZGlzYWJsZWQnKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyT25DaGFuZ2UoZm46IChtb2RlbFZhbHVlOiBhbnkpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLm9uTW9kZWxDaGFuZ2UgPSBmblxuICB9XG5cbiAgcmVnaXN0ZXJPblRvdWNoZWQoZm46ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLm9uTW9kZWxUb3VjaGVkID0gZm5cbiAgfVxuXG4gIHJlZ2lzdGVyT25WYWxpZGF0b3JDaGFuZ2UoZm46ICgpID0+IHZvaWQpIHtcbiAgICB0aGlzLm9uVmFsaWRhdG9yQ2hhbmdlZCA9IGZuXG4gIH1cblxuICB2YWxpZGF0ZSgpIHtcbiAgICBpZiAoIXRoaXMucXVpbGxFZGl0b3IpIHtcbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgY29uc3QgZXJyOiB7XG4gICAgICBtaW5MZW5ndGhFcnJvcj86IHtcbiAgICAgICAgZ2l2ZW46IG51bWJlclxuICAgICAgICBtaW5MZW5ndGg6IG51bWJlclxuICAgICAgfVxuICAgICAgbWF4TGVuZ3RoRXJyb3I/OiB7XG4gICAgICAgIGdpdmVuOiBudW1iZXJcbiAgICAgICAgbWF4TGVuZ3RoOiBudW1iZXJcbiAgICAgIH1cbiAgICAgIHJlcXVpcmVkRXJyb3I/OiB7IGVtcHR5OiBib29sZWFuIH1cbiAgICB9ID0ge31cbiAgICBsZXQgdmFsaWQgPSB0cnVlXG5cbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5xdWlsbEVkaXRvci5nZXRUZXh0KClcbiAgICAvLyB0cmltIHRleHQgaWYgd2FudGVkICsgaGFuZGxlIHNwZWNpYWwgY2FzZSB0aGF0IGFuIGVtcHR5IGVkaXRvciBjb250YWlucyBhIG5ldyBsaW5lXG4gICAgY29uc3QgdGV4dExlbmd0aCA9IHRoaXMudHJpbU9uVmFsaWRhdGlvbiA/IHRleHQudHJpbSgpLmxlbmd0aCA6ICh0ZXh0Lmxlbmd0aCA9PT0gMSAmJiB0ZXh0LnRyaW0oKS5sZW5ndGggPT09IDAgPyAwIDogdGV4dC5sZW5ndGggLSAxKVxuICAgIGNvbnN0IGRlbHRhT3BlcmF0aW9ucyA9IHRoaXMucXVpbGxFZGl0b3IuZ2V0Q29udGVudHMoKS5vcHNcbiAgICBjb25zdCBvbmx5RW1wdHlPcGVyYXRpb24gPSBkZWx0YU9wZXJhdGlvbnMgJiYgZGVsdGFPcGVyYXRpb25zLmxlbmd0aCA9PT0gMSAmJiBbJ1xcbicsICcnXS5pbmNsdWRlcyhkZWx0YU9wZXJhdGlvbnNbMF0uaW5zZXJ0KVxuXG4gICAgaWYgKHRoaXMubWluTGVuZ3RoICYmIHRleHRMZW5ndGggJiYgdGV4dExlbmd0aCA8IHRoaXMubWluTGVuZ3RoKSB7XG4gICAgICBlcnIubWluTGVuZ3RoRXJyb3IgPSB7XG4gICAgICAgIGdpdmVuOiB0ZXh0TGVuZ3RoLFxuICAgICAgICBtaW5MZW5ndGg6IHRoaXMubWluTGVuZ3RoXG4gICAgICB9XG5cbiAgICAgIHZhbGlkID0gZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5tYXhMZW5ndGggJiYgdGV4dExlbmd0aCA+IHRoaXMubWF4TGVuZ3RoKSB7XG4gICAgICBlcnIubWF4TGVuZ3RoRXJyb3IgPSB7XG4gICAgICAgIGdpdmVuOiB0ZXh0TGVuZ3RoLFxuICAgICAgICBtYXhMZW5ndGg6IHRoaXMubWF4TGVuZ3RoXG4gICAgICB9XG5cbiAgICAgIHZhbGlkID0gZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yZXF1aXJlZCAmJiAhdGV4dExlbmd0aCAmJiBvbmx5RW1wdHlPcGVyYXRpb24pIHtcbiAgICAgIGVyci5yZXF1aXJlZEVycm9yID0ge1xuICAgICAgICBlbXB0eTogdHJ1ZVxuICAgICAgfVxuXG4gICAgICB2YWxpZCA9IGZhbHNlXG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkID8gbnVsbCA6IGVyclxuICB9XG5cbiAgcHJpdmF0ZSBhZGRRdWlsbEV2ZW50TGlzdGVuZXJzKCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcG9zZSgpXG5cbiAgICAvLyBXZSBoYXZlIHRvIGVudGVyIHRoZSBgPHJvb3Q+YCB6b25lIHdoZW4gYWRkaW5nIGV2ZW50IGxpc3RlbmVycywgc28gYGRlYm91bmNlVGltZWAgd2lsbCBzcGF3biB0aGVcbiAgICAvLyBgQXN5bmNBY3Rpb25gIHRoZXJlIHcvbyB0cmlnZ2VyaW5nIGNoYW5nZSBkZXRlY3Rpb25zLiBXZSBzdGlsbCByZS1lbnRlciB0aGUgQW5ndWxhcidzIHpvbmUgdGhyb3VnaFxuICAgIC8vIGB6b25lLnJ1bmAgd2hlbiB3ZSBlbWl0IGFuIGV2ZW50IHRvIHRoZSBwYXJlbnQgY29tcG9uZW50LlxuICAgIHRoaXMuem9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbiA9IG5ldyBTdWJzY3JpcHRpb24oKVxuXG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbi5hZGQoXG4gICAgICAgIC8vIG1hcmsgbW9kZWwgYXMgdG91Y2hlZCBpZiBlZGl0b3IgbG9zdCBmb2N1c1xuICAgICAgICBmcm9tRXZlbnQodGhpcy5xdWlsbEVkaXRvciwgJ3NlbGVjdGlvbi1jaGFuZ2UnKS5zdWJzY3JpYmUoXG4gICAgICAgICAgKFtyYW5nZSwgb2xkUmFuZ2UsIHNvdXJjZV0pID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uQ2hhbmdlSGFuZGxlcihyYW5nZSwgb2xkUmFuZ2UsIHNvdXJjZSlcbiAgICAgICAgICB9XG4gICAgICAgIClcbiAgICAgIClcblxuICAgICAgLy8gVGhlIGBmcm9tRXZlbnRgIHN1cHBvcnRzIHBhc3NpbmcgSlF1ZXJ5LXN0eWxlIGV2ZW50IHRhcmdldHMsIHRoZSBlZGl0b3IgaGFzIGBvbmAgYW5kIGBvZmZgIG1ldGhvZHMgd2hpY2hcbiAgICAgIC8vIHdpbGwgYmUgaW52b2tlZCB1cG9uIHN1YnNjcmlwdGlvbiBhbmQgdGVhcmRvd24uXG4gICAgICBsZXQgdGV4dENoYW5nZSQgPSBmcm9tRXZlbnQodGhpcy5xdWlsbEVkaXRvciwgJ3RleHQtY2hhbmdlJylcbiAgICAgIGxldCBlZGl0b3JDaGFuZ2UkID0gZnJvbUV2ZW50KHRoaXMucXVpbGxFZGl0b3IsICdlZGl0b3ItY2hhbmdlJylcblxuICAgICAgaWYgKHR5cGVvZiB0aGlzLmRlYm91bmNlVGltZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdGV4dENoYW5nZSQgPSB0ZXh0Q2hhbmdlJC5waXBlKGRlYm91bmNlVGltZSh0aGlzLmRlYm91bmNlVGltZSkpXG4gICAgICAgIGVkaXRvckNoYW5nZSQgPSBlZGl0b3JDaGFuZ2UkLnBpcGUoZGVib3VuY2VUaW1lKHRoaXMuZGVib3VuY2VUaW1lKSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdWJzY3JpcHRpb24uYWRkKFxuICAgICAgICAvLyB1cGRhdGUgbW9kZWwgaWYgdGV4dCBjaGFuZ2VzXG4gICAgICAgIHRleHRDaGFuZ2UkLnN1YnNjcmliZSgoW2RlbHRhLCBvbGREZWx0YSwgc291cmNlXSkgPT4ge1xuICAgICAgICAgIHRoaXMudGV4dENoYW5nZUhhbmRsZXIoZGVsdGEsIG9sZERlbHRhLCBzb3VyY2UpXG4gICAgICAgIH0pXG4gICAgICApXG5cbiAgICAgIHRoaXMuc3Vic2NyaXB0aW9uLmFkZChcbiAgICAgICAgLy8gdHJpZ2dlcmVkIGlmIHNlbGVjdGlvbiBvciB0ZXh0IGNoYW5nZWRcbiAgICAgICAgZWRpdG9yQ2hhbmdlJC5zdWJzY3JpYmUoKFtldmVudCwgY3VycmVudCwgb2xkLCBzb3VyY2VdKSA9PiB7XG4gICAgICAgICAgdGhpcy5lZGl0b3JDaGFuZ2VIYW5kbGVyKGV2ZW50LCBjdXJyZW50LCBvbGQsIHNvdXJjZSlcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICB9KVxuICB9XG5cbiAgcHJpdmF0ZSBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnN1YnNjcmlwdGlvbiAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKVxuICAgICAgdGhpcy5zdWJzY3JpcHRpb24gPSBudWxsXG4gICAgfVxuICB9XG59XG5cbkBDb21wb25lbnQoe1xuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICBwcm92aWRlcnM6IFtcbiAgICB7XG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHByb3ZpZGU6IE5HX1ZBTFVFX0FDQ0VTU09SLFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11c2UtYmVmb3JlLWRlZmluZVxuICAgICAgdXNlRXhpc3Rpbmc6IGZvcndhcmRSZWYoKCkgPT4gUXVpbGxFZGl0b3JDb21wb25lbnQpXG4gICAgfSxcbiAgICB7XG4gICAgICBtdWx0aTogdHJ1ZSxcbiAgICAgIHByb3ZpZGU6IE5HX1ZBTElEQVRPUlMsXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVzZS1iZWZvcmUtZGVmaW5lXG4gICAgICB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBRdWlsbEVkaXRvckNvbXBvbmVudClcbiAgICB9XG4gIF0sXG4gIHNlbGVjdG9yOiAncXVpbGwtZWRpdG9yJyxcbiAgdGVtcGxhdGU6IGBcbiAgPG5nLWNvbnRlbnQgc2VsZWN0PVwiW3F1aWxsLWVkaXRvci10b29sYmFyXVwiPjwvbmctY29udGVudD5cbmAsXG4gIHN0eWxlczogW1xuICAgIGBcbiAgICA6aG9zdCB7XG4gICAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gICAgfVxuICAgIGBcbiAgXVxufSlcbmV4cG9ydCBjbGFzcyBRdWlsbEVkaXRvckNvbXBvbmVudCBleHRlbmRzIFF1aWxsRWRpdG9yQmFzZSB7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgaW5qZWN0b3I6IEluamVjdG9yLFxuICAgIEBJbmplY3QoRWxlbWVudFJlZikgZWxlbWVudFJlZjogRWxlbWVudFJlZixcbiAgICBASW5qZWN0KENoYW5nZURldGVjdG9yUmVmKSBjZDogQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICAgQEluamVjdChEb21TYW5pdGl6ZXIpIGRvbVNhbml0aXplcjogRG9tU2FuaXRpemVyLFxuICAgIEBJbmplY3QoUExBVEZPUk1fSUQpIHBsYXRmb3JtSWQ6IGFueSxcbiAgICBASW5qZWN0KFJlbmRlcmVyMikgcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICBASW5qZWN0KE5nWm9uZSkgem9uZTogTmdab25lLFxuICAgIEBJbmplY3QoUXVpbGxTZXJ2aWNlKSBzZXJ2aWNlOiBRdWlsbFNlcnZpY2VcbiAgKSB7XG4gICAgc3VwZXIoXG4gICAgICBpbmplY3RvcixcbiAgICAgIGVsZW1lbnRSZWYsXG4gICAgICBjZCxcbiAgICAgIGRvbVNhbml0aXplcixcbiAgICAgIHBsYXRmb3JtSWQsXG4gICAgICByZW5kZXJlcixcbiAgICAgIHpvbmUsXG4gICAgICBzZXJ2aWNlXG4gICAgKVxuICB9XG5cbn1cbiJdfQ==