# @churchtools-extensions/translator-webpubsub-access-function

This package contains the Azure Function responsible for providing access to Azure Web PubSub. It distinguishes between **Operators** and **Readers**.

## Endpoint

- **Name**: `webpubsub-access`
- **Route**: `POST /api/webpubsub-access`
- **Auth**: Anonymous (Handled via internal secrets)

## Request Logic

The function expects a JSON body:

```json
{
  "secret": "your-internal-secret",
  "roomId": "unique-room-id",
  "userId": "optional-user-id"
}
```

- **Operator Secret**: If the secret matches `OPERATOR_SECRET`, the user is granted permissions to join, send, and leave the specified `roomId`.
- **Reader Secret**: If the secret matches `READER_SECRET`, the user is granted permission to join and read from the specified `roomId`.

## Environment Variables

These are automatically configured by the `translator-infra` CLI during deployment:

- `WEBPUBSUB_CONNECTION_STRING`: The primary connection string for the Azure Web PubSub resource.
- `OPERATOR_SECRET`: A generated UUID used to authorize operators.
- `READER_SECRET`: A generated UUID used to authorize readers.

## CORS Configuration

CORS (Cross-Origin Resource Sharing) is configured automatically during setup via the `translator-infra` CLI to allow browser-based requests from:

- Local development environments (e.g., `http://localhost:5173`)
- ChurchTools instances (e.g., `https://mytown.church.tools`)

To update CORS settings after deployment, run the setup command again and select "Update existing WebPubSub Auth Function" → "Manage CORS settings".

## Local Development

If you want to run the function locally for testing:

1. Install Azure Functions Core Tools globally:

   ```bash
   npm install -g azure-functions-core-tools@4
   ```

2. Create a `local.settings.json` by copying [example.local.settings.json](./example.local.settings.json) and filling in the required values.

3. Start the function:

   ```bash
   npm install
   npm start
   ```

   The function will be available at `http://localhost:7071/api/webpubsub-access`

### Testing with REST Client

Install the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) in VS Code, then open [test.http](./test.http) and click "Send Request" above each request to test the endpoint.

## Deployment

Deployment is handled automatically by the [translator-infra](../translator-infra) package using `func azure functionapp publish`.
