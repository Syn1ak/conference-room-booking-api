#!/usr/bin/env bash
# Builds the client, publishes the API with it in wwwroot, and runs it the way it's deployed, on a fresh database.
# The client is built here rather than by the publish target, whose npm ci would replace node_modules under Playwright.
set -euo pipefail
out=../artifacts/e2e
node e2e/support/reset-database.mjs
npm run build
rm -rf "$out"
dotnet publish ../src/ConferenceRoomBooking.Api -c Release -p:SkipClientBuild=true -o "$out" --nologo -v quiet
cp -R dist/client/browser "$out/wwwroot"
# From its own folder, so it finds its appsettings.json and wwwroot.
cd "$out"
exec dotnet ConferenceRoomBooking.Api.dll
