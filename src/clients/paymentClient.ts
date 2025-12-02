import { StripeRoute } from "@/handlers/api/stripe";
import { hc } from "hono/client";
import { absoluteUrl } from "@/lib/utils";

export const paymentClient = hc<StripeRoute>(absoluteUrl("/api/stripe"));
