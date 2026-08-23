<div align="center">

# DS UPI QR GENERATOR

Create shareable UPI payment links and QR codes with a single Cloudflare Worker.

Fast, responsive, and deployable without a database or build process.

**Author:** [Sanchit Darandale](https://github.com/Sanchit-Darandale)

</div>

## Features

- Generate a payment QR code from the web interface.
- Open the payment directly in a compatible UPI app.
- Create fixed-amount payment links.
- Copy shareable payment URLs.
- Use the JSON API from websites, mobile apps, scripts, or backend services.
- Responsive interface for desktop and mobile phones.
- URL-safe `ds` token hides payment fields from casual URL inspection.
- No database, build tool, or server framework required.

## Project Structure

```text
.
|-- worker.js   Cloudflare Worker and local Node server
|-- README.md   Project documentation
|-- LICENSE     GNU Affero General Public License v3
```

## Web Usage

Open the deployed Worker root URL and enter:

1. UPI ID, required, for example `sanchit@ybl`
2. Recipient name, optional
3. Amount, required and greater than zero

Click **Generate QR**. The payment page displays the QR code and a button to open the payment in a UPI app. The copy button copies a shareable payment URL.

## Payment URL

Generated links use one encoded `ds` query parameter instead of exposing `pa`, `pn`, and `am` directly:

```text
https://your-domain.example/pay?ds=ENCODED_PAYMENT_DATA
```

The Worker decodes the token when the URL is opened. Generated public links use `ds`.

> `ds` is URL-safe obfuscation, not encryption. Do not use it to protect secrets or sensitive information.

## API

### Endpoint

```http
GET https://your-domain.example/api/qr
```

### Query Parameters

| Parameter | Required | Description                    | Example          |
| --------- | -------- | ------------------------------ | ---------------- |
| `pa`      | Yes      | UPI ID or VPA                  | `sanchit@ybl` |
| `pn`      | No       | Recipient name                 | `Sanchit`        |
| `am`      | Yes      | Positive payment amount in INR | `250`            |

### Example Request

```text
https://your-domain.example/api/qr?pa=sanchit%40ybl&pn=Sanchit&am=250
```

PowerShell:

```powershell
Invoke-RestMethod "https://your-domain.example/api/qr?pa=sanchit%40ybl&pn=Sanchit&am=250"
```

JavaScript:

```javascript
const response = await fetch(
  "https://your-domain.example/api/qr?pa=sanchit%40ybl&pn=Sanchit&am=250",
);
const payment = await response.json();
console.log(payment.paymentUrl);
```

### Example Response

```json
{
  "qrImageUrl": "https://api.qrserver.com/v1/create-qr-code/?data=...&size=200x200",
  "upiLink": "upi://pay?pa=sanchit%40ybl&pn=Sanchit&cu=INR&am=250",
  "paymentUrl": "https://your-domain.example/pay?ds=ENCODED_PAYMENT_DATA",
  "upiId": "sanchit@ybl",
  "name": "Sanchit",
  "amount": "250"
}
```

The API allows cross-origin requests with `Access-Control-Allow-Origin: *`.

### Rate Limit

The `/api/qr` endpoint allows **12 requests per 60 seconds per IP address**. The web page's **Generate QR** button uses this same endpoint, so it follows the same limit.

When the limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

The exact retry time is provided in the `Retry-After` response header. The default implementation stores counters in Worker memory, so limits are applied per active Worker isolate. For a globally consistent limit across all Cloudflare locations, use Durable Objects or another shared rate-limit service.

## Local Development

Requirements:

- Node.js 18 or newer

Run the Worker locally:

```bash
node worker.js
```

Open [http://localhost:8787](http://localhost:8787). To use another port:

```powershell
$env:PORT=8788; node worker.js
```

## Cloudflare Deployment

1. Sign in to Cloudflare.
2. Open **Workers & Pages** and create a Worker.
3. Replace the starter code with the contents of `worker.js`.
4. Deploy the Worker.
5. Open the Worker URL and test the form and `/api/qr` endpoint.

For production use, configure a custom domain or route in the Cloudflare Worker settings.

## External Service

QR images are generated through [QRServer](https://goqr.me/api/). The Worker does not store payment data, but QR image requests are sent to this external service.

## Limitations and Security

- This project creates payment links; it does not verify payment completion.
- Always confirm successful payment in your UPI app or bank account.
- Validate payment details before sharing a link.
- The `ds` value is reversible obfuscation, not encryption.
- The QR image depends on the availability of QRServer.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

## Credits

- **Sanchit Darandale (Developer)**
