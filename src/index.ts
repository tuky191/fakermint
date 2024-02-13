// src/index.ts

// Define a type for the event attributes to assist with TypeScript's type checking
interface EventAttribute {
  key: string;
  value: string;
  index: boolean;
}

interface TxEvent {
  type: string;
  attributes: EventAttribute[];
}

interface TxResult {
  tx_result: {
    events: TxEvent[];
  };
}

const base64EncodeAttributes = (attributes: EventAttribute[]) => {
  return attributes.map((attr) => ({
    ...attr,
    key: base64Encode(attr.key),
    value: base64Encode(attr.value),
  }));
};

addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  // Validate the request method and headers
  if (
    request.method === "POST" &&
    request.headers.get("Content-Type") === "application/json"
  ) {
    // Parse the request body to forward the request
    const requestBody = await request.json();

    // Specify the URL of the Tendermint ABCI app
    const apiUrl = "https://archive-rpc-osmosis.tfl.foundation:443";

    // Forward the request to the Tendermint ABCI app
    const originalResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    // Parse the response
    const originalResponseData: any = await originalResponse.json();
    // Modify the response if it contains the events you wish to encode
    if (originalResponseData.result && originalResponseData.result.txs) {
      for (let tx of originalResponseData.result.txs as TxResult[]) {
        if (tx.tx_result && tx.tx_result.events) {
          for (let event of tx.tx_result.events) {
            if (event.attributes) {
              event.attributes = base64EncodeAttributes(event.attributes);
            }
          }
        }
      }
    }
    if (originalResponseData.result && originalResponseData.result.tx_result) {
      for (let event of originalResponseData.result.tx_result
        .events as TxEvent[]) {
        if (event.attributes) {
          event.attributes = base64EncodeAttributes(event.attributes);
        }
      }
    }
    // Return the modified response
    return new Response(JSON.stringify(originalResponseData), {
      headers: { "Content-Type": "application/json" },
    });
  } else {
    // Return a 405 Method Not Allowed for non-POST requests or incorrect content type
    return new Response("Method Not Allowed", { status: 405 });
  }
}

// Encodes a string to base64
function base64Encode(value: string): string {
  let buffer = new TextEncoder().encode(value);
  let binary = "";
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
