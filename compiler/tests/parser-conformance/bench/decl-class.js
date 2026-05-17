// Bench: class declarations — methods + static + getters/setters + extends.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
class Base {
  constructor(x) {
    this.x = x;
  }
  greet() {
    return "hi";
  }
  static create() {
    return new Base(0);
  }
  get doubled() {
    return this.x * 2;
  }
  set doubled(v) {
    this.x = v / 2;
  }
}

class Derived extends Base {
  constructor(x, y) {
    super(x);
    this.y = y;
  }
  ["computed_" + "method"]() {
    return this.x + this.y;
  }
}
