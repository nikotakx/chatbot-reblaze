import { cn } from "../../client/src/lib/utils";

describe("Utils", () => {
  describe("cn function", () => {
    it("concatenates class names", () => {
      const result = cn("class1", "class2");
      expect(result).toBe("class1 class2");
    });

    it("filters out falsy values", () => {
      const result = cn("class1", false && "class2", null, undefined, 0, "class3");
      expect(result).toBe("class1 class3");
    });

    it("handles tailwind merge", () => {
      const result = cn("px-2 py-1", "px-4");
      expect(result).toBe("py-1 px-4");
    });
  });
});