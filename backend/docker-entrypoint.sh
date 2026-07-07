#!/bin/sh
set -e

# Railway mounts the persistent /app/uploads volume owned by root, shadowing
# the image's build-time `chown express:nodejs`. Because the container runs
# as non-root `express` (uid 1001), multer can't write into the mounted
# directory, causing a 500 EACCES on upload. Run as root at container start,
# fix ownership of the mounted volume (a no-op when already owned — e.g. the
# local docker-compose named volume — so this is safe everywhere), then drop
# privileges to `express` before exec'ing the actual process.
mkdir -p /app/uploads/lab-files
chown -R express:nodejs /app/uploads

exec su-exec express:nodejs "$@"
