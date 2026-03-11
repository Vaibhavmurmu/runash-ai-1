name: Auth OpenAPI Sync

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  openapi-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run openapi:auth:generate
      - run: git diff --exit-code docs/openapi/auth.openapi.json
