#!/usr/bin/env bash
# Creates the Azure resources for the app and connects GitHub Actions to them (ADR 0009):
#   - a resource group in Poland Central,
#   - an Azure SQL server with a database on the free offer (serverless, pauses when idle),
#   - a Linux App Service plan on the F1 Free tier and a .NET 10 web app,
#   - an Entra app registration that GitHub Actions signs in as through OpenID Connect, allowed to manage this
#     resource group only, and the GitHub secrets and variables the deploy workflow reads.
#
# Needs: az (signed in: `az login`) and gh (signed in: `gh auth login`), run from the repository root.
# Secrets are generated here and stored only in Azure and GitHub; the admin account's password is written to a local
# file outside the repository, readable only by you.
set -euo pipefail

REPO="${REPO:-Syn1ak/conference-room-booking-api}"
LOCATION="${LOCATION:-polandcentral}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-conference-rooms}"
SUFFIX="${SUFFIX:-$(openssl rand -hex 3)}"
SQL_SERVER="sql-conference-rooms-$SUFFIX"
SQL_DATABASE="conference-rooms"
SQL_ADMIN_USER="crbadmin"
PLAN="plan-conference-rooms"
WEB_APP="conference-rooms-$SUFFIX"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@conference-rooms.app}"
SECRETS_FILE="${SECRETS_FILE:-$HOME/.conference-rooms-azure.txt}"

password() { echo "$(openssl rand -base64 24 | tr -d '/+=')-Aa1!"; }
SQL_ADMIN_PASSWORD="$(password)"
ADMIN_PASSWORD="$(password)"
JWT_SIGNING_KEY="$(openssl rand -base64 48)"

echo "Creating resource group $RESOURCE_GROUP in $LOCATION"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

echo "Creating SQL server $SQL_SERVER and database $SQL_DATABASE (free offer)"
az sql server create --resource-group "$RESOURCE_GROUP" --name "$SQL_SERVER" --location "$LOCATION" \
  --admin-user "$SQL_ADMIN_USER" --admin-password "$SQL_ADMIN_PASSWORD" --minimal-tls-version 1.2 --output none
az sql db create --resource-group "$RESOURCE_GROUP" --server "$SQL_SERVER" --name "$SQL_DATABASE" \
  --edition GeneralPurpose --compute-model Serverless --family Gen5 --capacity 2 \
  --use-free-limit --free-limit-exhaustion-behavior AutoPause --output none
# 0.0.0.0 lets Azure services, such as the web app, reach the server; nothing else can.
az sql server firewall-rule create --resource-group "$RESOURCE_GROUP" --server "$SQL_SERVER" \
  --name AllowAzureServices --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0 --output none

echo "Creating App Service plan (F1 Free, Linux) and web app $WEB_APP"
az appservice plan create --resource-group "$RESOURCE_GROUP" --name "$PLAN" --location "$LOCATION" \
  --is-linux --sku F1 --output none
az webapp create --resource-group "$RESOURCE_GROUP" --plan "$PLAN" --name "$WEB_APP" \
  --runtime "DOTNETCORE:10.0" --https-only true --output none

CONNECTION_STRING="Server=tcp:$SQL_SERVER.database.windows.net,1433;Database=$SQL_DATABASE;User ID=$SQL_ADMIN_USER;Password=$SQL_ADMIN_PASSWORD;Encrypt=True;TrustServerCertificate=False;Connection Timeout=60"
az webapp config appsettings set --resource-group "$RESOURCE_GROUP" --name "$WEB_APP" --output none --settings \
  ASPNETCORE_ENVIRONMENT=Production \
  ASPNETCORE_FORWARDEDHEADERS_ENABLED=true \
  "ConnectionStrings__DefaultConnection=$CONNECTION_STRING" \
  "Jwt__SigningKey=$JWT_SIGNING_KEY" \
  "AdminAccount__Email=$ADMIN_EMAIL" \
  "AdminAccount__Password=$ADMIN_PASSWORD"

echo "Connecting GitHub Actions through OpenID Connect"
SUBSCRIPTION_ID="$(az account show --query id --output tsv)"
TENANT_ID="$(az account show --query tenantId --output tsv)"
CLIENT_ID="$(az ad app create --display-name "github-$WEB_APP" --query appId --output tsv)"
az ad sp create --id "$CLIENT_ID" --output none
az ad app federated-credential create --id "$CLIENT_ID" --parameters "{
  \"name\": \"github-master\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:$REPO:ref:refs/heads/master\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}" --output none
# Role assignment can fail for a few seconds while the new service principal replicates.
for attempt in 1 2 3 4 5 6; do
  az role assignment create --assignee "$CLIENT_ID" --role Contributor \
    --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" --output none && break
  sleep 10
done

gh secret set AZURE_CLIENT_ID --repo "$REPO" --body "$CLIENT_ID"
gh secret set AZURE_TENANT_ID --repo "$REPO" --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --repo "$REPO" --body "$SUBSCRIPTION_ID"
gh secret set SQL_CONNECTION_STRING --repo "$REPO" --body "$CONNECTION_STRING"
gh variable set AZURE_RESOURCE_GROUP --repo "$REPO" --body "$RESOURCE_GROUP"
gh variable set AZURE_WEBAPP_NAME --repo "$REPO" --body "$WEB_APP"
gh variable set AZURE_SQL_SERVER --repo "$REPO" --body "$SQL_SERVER"

umask 077
cat > "$SECRETS_FILE" <<SECRETS
App:            https://$WEB_APP.azurewebsites.net
Admin email:    $ADMIN_EMAIL
Admin password: $ADMIN_PASSWORD
SECRETS
echo "Done. The app will be at https://$WEB_APP.azurewebsites.net after the first deployment."
echo "The admin account's sign-in is in $SECRETS_FILE (readable only by you)."
