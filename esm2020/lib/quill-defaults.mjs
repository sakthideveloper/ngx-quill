export const defaultModules = {
    toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ header: 1 }, { header: 2 }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ script: 'sub' }, { script: 'super' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ direction: 'rtl' }],
        [{ size: ['small', false, 'large', 'huge'] }],
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [
            { color: [] },
            { background: [] }
        ],
        [{ font: [] }],
        [{ align: [] }],
        ['clean'],
        ['link', 'image', 'video'] // link and image, video
    ]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpbGwtZGVmYXVsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9uZ3gtcXVpbGwvc3JjL2xpYi9xdWlsbC1kZWZhdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUc7SUFDNUIsT0FBTyxFQUFFO1FBQ1AsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUM7UUFDekMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDO1FBRTVCLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDOUIsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUN6QyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3hDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDcEMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUV0QixDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUM3QyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUV2QztZQUNFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUNiLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTtTQUNuQjtRQUNELENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFDZCxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBRWYsQ0FBQyxPQUFPLENBQUM7UUFFVCxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsd0JBQXdCO0tBQ3BEO0NBQ0YsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBkZWZhdWx0TW9kdWxlcyA9IHtcbiAgdG9vbGJhcjogW1xuICAgIFsnYm9sZCcsICdpdGFsaWMnLCAndW5kZXJsaW5lJywgJ3N0cmlrZSddLCAvLyB0b2dnbGVkIGJ1dHRvbnNcbiAgICBbJ2Jsb2NrcXVvdGUnLCAnY29kZS1ibG9jayddLFxuXG4gICAgW3sgaGVhZGVyOiAxIH0sIHsgaGVhZGVyOiAyIH1dLCAvLyBjdXN0b20gYnV0dG9uIHZhbHVlc1xuICAgIFt7IGxpc3Q6ICdvcmRlcmVkJyB9LCB7IGxpc3Q6ICdidWxsZXQnIH1dLFxuICAgIFt7IHNjcmlwdDogJ3N1YicgfSwgeyBzY3JpcHQ6ICdzdXBlcicgfV0sIC8vIHN1cGVyc2NyaXB0L3N1YnNjcmlwdFxuICAgIFt7IGluZGVudDogJy0xJyB9LCB7IGluZGVudDogJysxJyB9XSwgLy8gb3V0ZGVudC9pbmRlbnRcbiAgICBbeyBkaXJlY3Rpb246ICdydGwnIH1dLCAvLyB0ZXh0IGRpcmVjdGlvblxuXG4gICAgW3sgc2l6ZTogWydzbWFsbCcsIGZhbHNlLCAnbGFyZ2UnLCAnaHVnZSddIH1dLCAvLyBjdXN0b20gZHJvcGRvd25cbiAgICBbeyBoZWFkZXI6IFsxLCAyLCAzLCA0LCA1LCA2LCBmYWxzZV0gfV0sXG5cbiAgICBbXG4gICAgICB7IGNvbG9yOiBbXSB9LFxuICAgICAgeyBiYWNrZ3JvdW5kOiBbXSB9XG4gICAgXSwgLy8gZHJvcGRvd24gd2l0aCBkZWZhdWx0cyBmcm9tIHRoZW1lXG4gICAgW3sgZm9udDogW10gfV0sXG4gICAgW3sgYWxpZ246IFtdIH1dLFxuXG4gICAgWydjbGVhbiddLCAvLyByZW1vdmUgZm9ybWF0dGluZyBidXR0b25cblxuICAgIFsnbGluaycsICdpbWFnZScsICd2aWRlbyddIC8vIGxpbmsgYW5kIGltYWdlLCB2aWRlb1xuICBdXG59XG4iXX0=