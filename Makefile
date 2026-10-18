.PHONY: test typecheck build

test:
	$(MAKE) -C backend test
	$(MAKE) -C frontend test

typecheck:
	$(MAKE) -C backend typecheck
	$(MAKE) -C frontend typecheck

build:
	$(MAKE) -C backend build
	$(MAKE) -C frontend build
