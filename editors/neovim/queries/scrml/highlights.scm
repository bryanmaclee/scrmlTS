; scrml Tree-sitter highlight queries
;
; NOTE: scrml does not yet have a Tree-sitter parser. These queries are
; placeholder/aspirational and document the intended highlight mappings
; for when a Tree-sitter grammar is built.
;
; Currently, syntax highlighting in Neovim for scrml relies on the
; TextMate grammar (via the vscode-tmgrammar plugin or similar).
;
; To use TextMate highlighting in Neovim, consider one of:
;   - nvim-textmate (uses TextMate grammars directly)
;   - Setting up vim syntax rules (see below for a basic approach)

; --- Aspirational Tree-sitter queries ---

; Tags
; (tag_name) @tag
; (closing_tag_name) @tag

; Attributes
; (attribute_name) @tag.attribute
; (attribute_value) @string

; Reactive variables
; (reactive_variable) @variable.builtin

; Keywords
; ["lift" "match" "is" "enum" "struct" "fn" "pure" "server" "let" "const" "lin"
;  "type" "import" "export" "from" "as" "if" "else" "for" "while" "of" "in"
;  "return" "function" "async" "await" "navigate"] @keyword

; Strings
; (string_literal) @string

; Numbers
; (number_literal) @number

; Comments
; (comment) @comment

; Logic block delimiters
; "${" @punctuation.special
; "?{" @punctuation.special
; "^{" @punctuation.special
; "#{" @punctuation.special

; Function names
; (function_declaration name: (identifier) @function)

; Type names
; (type_declaration name: (identifier) @type)

; Operators
; ["=>" "::" "->" "..." "==" "!=" "<=" ">="] @operator

; protect= attribute
; (protect_attribute) @tag.attribute.builtin
