build:
	npm run build

TJS ?= typescript-json-schema
# TJS ?= ./node_modules/.bin/typescript-json-schema

schema: build
	$(TJS) --no-filterMethods --required --noExtraProps --propOrder -o example/schema.json --plugins tjs-methods -- ./example/tsconfig.json '*'

