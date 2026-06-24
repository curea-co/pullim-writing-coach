import { Extension } from "@tiptap/core";
// TextStyle 위에 fontSize 속성을 얹는 최소 확장. setFontSize/unsetFontSize 커맨드 제공.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: { setFontSize: (size: string) => ReturnType; unsetFontSize: () => ReturnType };
  }
}
export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
