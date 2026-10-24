import { preparePayment, submitPayment, paymentStatus } from "@/lib/paiflow";
import { parsePayAction } from "@/lib/pay-request";
import { handle, sameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const action = parsePayAction(await request.text());
    switch (action.action) {
      case "prepare":
        return preparePayment(action.from, action.amountStroops);
      case "status":
        return paymentStatus(action.txHash);
      case "submit":
        return submitPayment(action.signedXdr, action.preparationRequestId);
    }
  });
}
