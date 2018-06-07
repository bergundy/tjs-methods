TJS ?= typescript-json-schema
# TJS ?= ./node_modules/.bin/typescript-json-schema

TS_FILES := $(shell find src -type f -name '*.ts')
JS_FILES := $(patsubst src/%.ts, dist/%.js, $(TS_FILES))


example/schema.json: example/rpc.ts example/tsconfig.json
	$(TJS) --required --noExtraProps --propOrder -o example/schema.json -- ./example/tsconfig.json '*'

dist/%.js: src/%.ts
	npm run build

.PHONY: schema
schema: example/schema.json

service/schema.ts: $(JS_FILES) example/schema.json template.ts
	node dist/generate.js | mustache - template.ts > service/schema.ts

.PHONY: codegen
codegen: service/schema.ts

.PHONY: build
build: $(JS_FILES)

.PHONY: test
test:
	npm test

clean:
	rm -rf example/schema.json service/schema.ts dist/*
