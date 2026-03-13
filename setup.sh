#!/bin/bash
set -e

echo "=== POC Template Setup ==="

# Install dependencies
echo ">> Installing npm packages..."
npm install

# Install shadcn/ui components
echo ">> Installing shadcn/ui components..."
npx shadcn@latest add -y \
  button \
  card \
  input \
  label \
  dialog \
  form \
  select \
  tabs \
  table \
  badge \
  skeleton \
  sonner \
  tooltip \
  sidebar \
  scroll-area \
  separator \
  dropdown-menu \
  sheet \
  avatar \
  accordion \
  alert \
  alert-dialog \
  checkbox \
  collapsible \
  command \
  context-menu \
  hover-card \
  menubar \
  navigation-menu \
  pagination \
  popover \
  progress \
  radio-group \
  slider \
  switch \
  textarea \
  toggle \
  toggle-group

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. cp .env.example .env"
echo "  2. Edit .env with your Supabase credentials"
echo "  3. npm run dev"
echo ""
