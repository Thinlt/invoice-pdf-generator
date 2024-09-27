FROM ghcr.io/puppeteer/puppeteer:23.4.0

ARG NODE_ENV=production
ARG IS_DOCKER=true
# Use production node environment by default.
ENV NODE_ENV=$NODE_ENV
ENV IS_DOCKER=$IS_DOCKER

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /var/www/pdf_invoice/pdf_generator

# Run the application as a non-root user.
USER pptruser

COPY --chmod=0755 --chown=pptruser:pptruser . .

# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

RUN touch ./paged.polyfill.js && chown -R pptruser:pptruser ./
RUN node -v

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
SHELL ["/bin/bash", "-c"]
CMD ["node", "index.js"]
