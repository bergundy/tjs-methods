TS_FILES := $(shell find src -type f -name '*.ts')
JS_FILES := $(patsubst src/%.ts, dist/%.js, $(TS_FILES))

dist/%.js: src/%.ts
	npm run build

.PHONY: build
build: $(JS_FILES)

.PHONY: test
test: build
	npm test

clean:
	rm -rf dist/*
