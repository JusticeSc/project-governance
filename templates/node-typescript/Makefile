# package.json owns the real commands.
.DEFAULT_GOAL := help
.PHONY: help build clean start start-built check
PNPM ?= pnpm
ARGS ?=
help:
	@echo "make build        compile and bundle retained Node workspaces"
	@echo "make clean        remove repository-owned build output"
	@echo "make start        run the source application; ARGS forwards options"
	@echo "make start-built  consume built lib output; run build first"
	@echo "make check        run every local/CI gate; Git baseline required"
build:
	$(PNPM) run build
clean:
	$(PNPM) run clean
start:
	$(PNPM) run start $(ARGS)
start-built:
	$(PNPM) run start:built $(ARGS)
check:
	$(PNPM) run check:all
