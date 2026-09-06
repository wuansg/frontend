.PHONY: download-monaco-deps clean bump-patch bump-minor bump-major tag-release

download-monaco-deps:
	@echo "sing-box schema is bundled in public/assets"

clean:
	@true

bump-patch:
	npm version patch --no-git-tag-version
	npm install

bump-minor:
	npm version minor --no-git-tag-version
	npm install

bump-major:
	npm version major --no-git-tag-version
	npm install

tag-release:
	@VERSION=$$(node -p "require('./package.json').version") && \
	echo "Creating signed tag for version $$VERSION..." && \
	git tag -s "$$VERSION" -m "Release $$VERSION" && \
	git push origin --follow-tags && \
	echo "Signed tag $$VERSION created and pushed"
