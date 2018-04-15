# Outkit API Client
This is the official JavaScript client for the [Outkit](https://outkit.io/) API. It currently supports server-side use (node.js) only.

## Installation

```
npm install @outkit/outkit
```

## Usage

### Authentication and setup
```js
const Outkit = require('outkit');

const client = new Outkit.Client({
  key: '',           // Fill in your API key
  secret: '',        // Fill in your API secret
  passphrase: '',    // Fill in your API passphrase (not your personal password)
});
```

### Submitting a message
Submitting a message for rendering and/or delivery will return a message record with the Outkit ID and the status set to `received`. 
The API call returns as soon as the message is saved on our servers, it does not wait for rendering or delivery to take place. You 
can retrieve the status of a message at any time. We also support webhook notifications on status changes.

```js
// Construct a message record
const messageRecord = {
  type: 'email',                   // Message type - 'email' and 'sms' currently supported
  project: 'my-project',           // Project identifier
  template: 'my-welcome',          // Template identifier
  subject: 'Welcome, Jane!',       // Email subject (optional, can also be set in the template or omitted for SMS messages)
  to: 'some.name@example.com',     // Recipient address (and optional name)
  from: 'other.name@example.com',  // Sender address (and optional name)
  data: {
    name: 'John Doe',
    // ...
    // Add the values for any variables used in the template here
  },
};

// Then submit it, either using Promises...
const data = await client.createMessage(messageRecord);

// ... or traditional callback-style
client.createMessage(messageRecord, (err, data) => {
  // handle error or use data
});

// Both calling styles support a second opts object, where you can 
// set `returnResponse` to true to get the full response from the
// underlying http library, not just the response body. Like so:
const data = await client.createMessage(messageRecord, {returnResponse: true});
```

### Rendering a message
To support the use case of rendering a message using the Outkit infrastructure, but sending it yourself, you can specify
`render_only: true` in the message record.

Once the message has been rendered, its data will contain a `text_body` field (all types), and `subject` and `html_body` 
fields for emails. These can then be fed directly to, say, a Mailgun client or SMTP server. See details below.

### Synchronous processing
For some use cases (sending emails from scripts, using Outkit as a renderer etc.), it can be desirable to have the
API calls operate synchronously - ie. attempt rendering/delivery immediately instead of queueing them, and return the 
rendered message and (optionally) its delivery status in the data from the API call. This can be accomplished by setting 
`sync: true` in the submitted message. 

Note that this will incur additional costs (see our pricing page for details), and that each Outkit customer is only allowed 
a limited number of such requests (currently 100.000 per month), since they are more difficult and costly for us to scale.
Customers that need additional synchronous requests can contact support to have their monthly limit raised.


### Retrieving a message
You can retrieve the status and data of a message at any time. After the message has been rendered, we will also return the 
applicable rendered fields (`subject`, `html_body` and `text_body` for emails, `text_body` for SMS messages) so that you 
can see exactly what was/will be sent.

```js
// Using Promises
const data = await client.getMessage(messageId);

// Or using callback-style
client.getMessage(messageId, (err, data) => {
  // handle error or use data
});
```

### Return values
Both API calls return a single JSON document (wrapped in a `data` key) with information about the message 
being submitted/inquired about, as well as an outer `meta` key with metadata. Which fields have content at 
any given time depends on which fields were submitted and the current status of the message.

```js
{
  meta: {...},
  data: {
    type: 'email',
    id: '578b072e-79e4-441e-b696-784aa744bf6e',
    project: 'my-project',
    template: 'my-welcome',
    to: 'some.name@example.com',
    from: 'other.name@example.com',
    status: 'received',
    subject: 'Welcome, Jane!',
    html_body: null,
    text_body: null,
    data: null,
    created_at: '2017-07-21T19:17:35.383277Z',
    failed_at: null,
    queued_at: null,
    delivered_at: null,
    done: false,
  },
}
```

## Message lifecycle

Submitted messages typically go through the following stages, which are reflected in the `status` field:

* `received` - The message has been received and saved in our datastore, where it awaits further processing
* `queued_for_rendering` - The message has been queued for rendering
* `rendered` - The subject and HTML/text of the template have been rendered and merged with the submitted data
* `queued_for_delivery` - The message has been queued for delivery
* `delivered` - Message has been successfully delivered to the backend

Typically, a message will go through all stages in a matter of milliseconds, but it can sometimes take a little longer. 

Note that different message can have different statuses. For example, a message with the `render_only` flag set will
never be queued for delivery or delivered. Messages that supply their own `text_body` and `html_body` instead of
using a template will never be rendered, only delivered.

Note that the `delivered` status does not necessarily mean that the message has been delivered to the *end user*. Once the
backend has accepted the message, it’s up to the backend to perform final delivery. Most backends offer webhooks if you 
need confirmation of the actual delivery. 

There are some additional statuses your message can have, in case of errors and problems:

* `render_error` - We were unable to render the template with the submitted data
* `backend_error` - We encountered an error when trying to submit the message to the configured backend
* `internal_error` - There was an unrecoverable problem on our end (should be very rare)

If the message has any of these statuses, there will be more information in the `status_message` field. Also, you
can inspect the full backend response in the `response` field.

All messages have a `done` flag (true or false) which indicate whether we have finished processing it. Nothing more
will happen to a message once it is done, regardless of its status.