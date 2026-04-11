# scrml Neovim Integration

## Prerequisites

- [Bun](https://bun.sh) runtime installed
- The scrml LSP server dependencies installed: `bun add vscode-languageserver vscode-languageserver-textdocument` (run from the scrml project root)
- [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig) (recommended) or Neovim 0.8+

## Setup

### 1. Filetype Detection

Copy the filetype detection file to your Neovim config:

```bash
mkdir -p ~/.config/nvim/ftdetect
cp editors/neovim/scrml.vim ~/.config/nvim/ftdetect/scrml.vim
```

Or add this to your `init.lua`:

```lua
vim.filetype.add({
  extension = {
    scrml = "scrml",
  },
})
```

### 2. LSP Configuration

#### Option A: With nvim-lspconfig (recommended)

Copy `scrml.lua` to your Neovim Lua path and require it:

```bash
mkdir -p ~/.config/nvim/lua
cp editors/neovim/scrml.lua ~/.config/nvim/lua/scrml.lua
```

In your `init.lua`:

```lua
require("scrml").setup({
  -- Optional: explicit path to the LSP server
  -- server_path = "/path/to/scrml/lsp/server.js",

  -- Optional: runtime (default: "bun")
  -- runtime = "bun",

  -- Optional: pass on_attach and capabilities from your LSP config
  -- on_attach = your_on_attach_function,
  -- capabilities = your_capabilities,
})
```

The setup function will auto-detect the server path if you are working within the scrml project directory.

#### Option B: Without nvim-lspconfig (Neovim 0.8+ built-in LSP)

```lua
require("scrml").setup_manual({
  server_path = "/path/to/scrml/lsp/server.js",
  runtime = "bun",
})
```

#### Option C: Minimal inline config (no external files)

```lua
-- Filetype detection
vim.filetype.add({ extension = { scrml = "scrml" } })

-- LSP setup
vim.api.nvim_create_autocmd("FileType", {
  pattern = "scrml",
  callback = function()
    vim.lsp.start({
      name = "scrml",
      cmd = { "bun", "run", "/path/to/scrml/lsp/server.js", "--stdio" },
      root_dir = vim.fs.dirname(
        vim.fs.find({ "package.json", "SPEC.md", ".git" }, { upward = true })[1]
      ),
    })
  end,
})
```

### 3. Syntax Highlighting

scrml does not yet have its own Tree-sitter grammar, but a Tree-sitter highlights query
(`queries/scrml/highlights.scm`) ships in this directory and can be used with an
adapter parser. For full setups, you have several options:

#### Option A: Use vim syntax highlighting

Add basic syntax rules to `~/.config/nvim/syntax/scrml.vim`:

```vim
" Basic scrml syntax highlighting
if exists("b:current_syntax")
  finish
endif

" Comments
syn match scrmlComment "//.*$"

" Strings
syn region scrmlString start=/"/ end=/"/ skip=/\\"/
syn region scrmlString start=/`/ end=/`/ skip=/\\`/

" Reactive variables
syn match scrmlReactive "@[a-zA-Z_][a-zA-Z0-9_]*"

" Keywords
syn keyword scrmlKeyword lift match is enum struct fn pure server let const lin type import export from as function return if else for while of in async await navigate

" Context delimiters
syn match scrmlDelimiter "\${"
syn match scrmlDelimiter "?{"
syn match scrmlDelimiter "\^{"
syn match scrmlDelimiter "#{"

" Tags
syn match scrmlTag "<\/\?[a-zA-Z][a-zA-Z0-9-]*"
syn match scrmlTagClose "</[a-zA-Z][a-zA-Z0-9-]*>"

" Numbers
syn match scrmlNumber "\<\d\+\(\.\d\+\)\?\>"

" Highlight links
hi def link scrmlComment Comment
hi def link scrmlString String
hi def link scrmlReactive Identifier
hi def link scrmlKeyword Keyword
hi def link scrmlDelimiter Special
hi def link scrmlTag Tag
hi def link scrmlTagClose Tag
hi def link scrmlNumber Number

let b:current_syntax = "scrml"
```

#### Option B: Use a TextMate grammar plugin

If you use a plugin that supports TextMate grammars (such as nvim-textmate), point it at:

```
editors/vscode/syntaxes/scrml.tmLanguage.json
```

## Verification

1. Open a `.scrml` file in Neovim
2. Check that the filetype is detected: `:set ft?` should show `filetype=scrml`
3. Check LSP is attached: `:LspInfo` should show the scrml server
4. Diagnostics should appear if the file has errors
5. Completions should work with your completion plugin (nvim-cmp, etc.)

## Troubleshooting

- If the LSP server does not start, check that `bun` is in your PATH
- Run `bun run lsp/server.js --stdio` manually to verify it starts without errors
- Check `:LspLog` for server error messages
- Ensure the LSP dependencies are installed in the scrml project root
