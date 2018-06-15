TS_FILES := $(shell find src -type f -name '*.ts')
JS_FILES := $(patsubst src/%.ts, dist/%.js, $(TS_FILES))

dist/%.js: src/%.ts
	npm run build

service/schema.ts: $(JS_FILES) example/rpc.ts example/tsconfig.json template.ts
	node dist/cli.js example/rpc.ts > service/schema.ts

.PHONY: codegen
codegen: service/schema.ts

.PHONY: build
build: $(JS_FILES)

.PHONY: test
test: build
	npm test

clean:
	rm -rf service/schema.ts dist/*
