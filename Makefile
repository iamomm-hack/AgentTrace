.PHONY: test typecheck build

test:
	$(MAKE) -C backend test
	$(MAKE) -C frontend test
	npm --prefix sdk/typescript test

typecheck:
	$(MAKE) -C backend typecheck
	$(MAKE) -C frontend typecheck
	npm --prefix sdk/typescript run typecheck

build:
	$(MAKE) -C backend build
	$(MAKE) -C frontend build
	npm --prefix sdk/typescript run build
