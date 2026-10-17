# Intelligence Designed To Evolve

Static, full-bleed landing page built with HTML, CSS, and vanilla JavaScript. The page uses the supplied CloudFront video as its looping background and includes responsive desktop/mobile navigation, entrance animations, reduced-motion support, and animated platform metrics.

## Setup

The project is pinned to Node `24.22.0` in `.nvmrc` and has no runtime npm dependencies.

```sh
nvm use
npm ci
```

Network access is only needed for the fonts, Font Awesome stylesheet, and background video loaded by the page. The static checks run offline.

## Run

There is no build step. For a local preview, use the built-in Python static server:

```sh
python3 -m http.server 3000
```

Open <http://localhost:3000>.

## Test

```sh
make test
```

The test checks the required markup, exact external media/font URLs, local assets, responsive CSS, animations, and vanilla JS interactions without making network requests.

## Docker

```sh
docker build -t intelligence-designed-to-evolve .
docker run --rm -p 3000:3000 intelligence-designed-to-evolve
```

Open <http://localhost:3000>.

## Deploy

Deploy the contents of this folder to any static host. Configure the host to serve `index.html` for `/` and preserve the `assets/` and `fonts/` paths.
