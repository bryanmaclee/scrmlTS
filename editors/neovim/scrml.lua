-- scrml LSP configuration for Neovim
--
-- Usage with nvim-lspconfig:
--   1. Copy this file to your Neovim config (e.g., ~/.config/nvim/lua/scrml.lua)
--   2. Copy scrml.vim to ~/.config/nvim/ftdetect/scrml.vim
--   3. In your init.lua or plugin config, call: require("scrml").setup()
--
-- Usage without nvim-lspconfig (manual):
--   require("scrml").setup_manual()

local M = {}

-- Default configuration
M.config = {
  -- Path to the scrml LSP server
  -- Set this to the absolute path of lsp/server.js in your scrml project
  server_path = nil,

  -- Runtime command (bun or node)
  runtime = "bun",

  -- Additional server settings
  settings = {},
}

--- Find the server path by searching upward from the current file
--- or using a well-known location.
local function find_server_path()
  -- Check if explicitly configured
  if M.config.server_path then
    return M.config.server_path
  end

  -- Try to find it relative to the current working directory
  local cwd = vim.fn.getcwd()
  local candidates = {
    cwd .. "/lsp/server.js",
    cwd .. "/node_modules/.bin/scrml-lsp",
  }

  for _, path in ipairs(candidates) do
    if vim.fn.filereadable(path) == 1 then
      return path
    end
  end

  -- Fall back to a global install location
  local home = vim.fn.expand("$HOME")
  local global_path = home .. "/.scrml/lsp/server.js"
  if vim.fn.filereadable(global_path) == 1 then
    return global_path
  end

  return nil
end

--- Setup using nvim-lspconfig
function M.setup(opts)
  opts = opts or {}
  M.config = vim.tbl_deep_extend("force", M.config, opts)

  local ok, lspconfig = pcall(require, "lspconfig")
  if not ok then
    vim.notify("scrml: nvim-lspconfig not found. Use require('scrml').setup_manual() instead.", vim.log.levels.WARN)
    return
  end

  local configs = require("lspconfig.configs")

  -- Register scrml as a new LSP config if not already registered
  if not configs.scrml then
    configs.scrml = {
      default_config = {
        cmd = nil, -- Set dynamically below
        filetypes = { "scrml" },
        root_dir = function(fname)
          return lspconfig.util.root_pattern("package.json", "SPEC.md", ".git")(fname)
            or lspconfig.util.path.dirname(fname)
        end,
        single_file_support = true,
        settings = {},
      },
    }
  end

  local server_path = find_server_path()
  if not server_path then
    vim.notify(
      "scrml: Could not find LSP server. Set server_path in setup() or ensure lsp/server.js exists in your project.",
      vim.log.levels.ERROR
    )
    return
  end

  lspconfig.scrml.setup({
    cmd = { M.config.runtime, "run", server_path, "--stdio" },
    settings = M.config.settings,
    on_attach = opts.on_attach,
    capabilities = opts.capabilities,
  })
end

--- Manual setup without nvim-lspconfig
function M.setup_manual(opts)
  opts = opts or {}
  M.config = vim.tbl_deep_extend("force", M.config, opts)

  local server_path = find_server_path()
  if not server_path then
    vim.notify(
      "scrml: Could not find LSP server. Set server_path in setup_manual().",
      vim.log.levels.ERROR
    )
    return
  end

  vim.api.nvim_create_autocmd("FileType", {
    pattern = "scrml",
    callback = function()
      vim.lsp.start({
        name = "scrml",
        cmd = { M.config.runtime, "run", server_path, "--stdio" },
        root_dir = vim.fs.dirname(vim.fs.find({ "package.json", "SPEC.md", ".git" }, { upward = true })[1]),
        settings = M.config.settings,
      })
    end,
  })
end

return M
