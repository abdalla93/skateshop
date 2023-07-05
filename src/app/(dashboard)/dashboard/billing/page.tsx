import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { env } from "@/env.mjs"
import { currentUser } from "@clerk/nextjs"

import { storeSubscriptionPlans } from "@/config/subscriptions"
import { stripe } from "@/lib/stripe"
import { getUserSubscriptionPlan } from "@/lib/subscription"
import { formatDate, formatPrice } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ManageSubscriptionForm } from "@/components/forms/manage-subscription-form"
import { Header } from "@/components/header"
import { Icons } from "@/components/icons"
import { Shell } from "@/components/shell"

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Billing",
  description: "Manage your billing and subscription",
}

export default async function BillingPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/signin")
  }

  const email =
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? ""

  const subscriptionPlan = await getUserSubscriptionPlan(user.id)

  // If user has a pro plan, check cancel status on Stripe.
  let isCanceled = false
  if (subscriptionPlan?.isPro && subscriptionPlan?.stripeSubscriptionId) {
    const stripePlan = await stripe.subscriptions.retrieve(
      subscriptionPlan?.stripeSubscriptionId
    )
    isCanceled = stripePlan.cancel_at_period_end
  }

  return (
    <Shell as="div" layout="dashboard" className="gap-10">
      <Header
        title="Billing"
        description="Manage your billing and subscription"
        size="sm"
      />
      <section
        id="billing-info"
        aria-labelledby="billing-info-heading"
        className="space-y-5"
      >
        <h2 className="text-xl font-medium sm:text-2xl">Billing info</h2>
        <Card className="grid gap-6 p-6">
          {subscriptionPlan ? (
            <>
              <div className="flex flex-col space-y-2">
                <div className="text-3xl font-bold">
                  {subscriptionPlan.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(new Date())}
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <div className="text-sm text-muted-foreground">
                  {subscriptionPlan.isPro
                    ? "You are currently subscribed to the Pro plan."
                    : "You are currently subscribed to the Free plan."}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isCanceled
                    ? "Your subscription will automatically renew on the next billing date."
                    : "Your subscription will expire on the next billing date."}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-2">
              <div className="text-sm text-muted-foreground">
                You are not currently subscribed to any plan.
              </div>
              <div className="text-sm text-muted-foreground">
                You can subscribe to a plan below.
              </div>
            </div>
          )}
        </Card>
      </section>
      <section
        id="subscription-plans"
        aria-labelledby="subscription-plans-heading"
        className="space-y-5"
      >
        <h2 className="text-xl font-medium sm:text-2xl">Choose a plan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {storeSubscriptionPlans.map((plan) => (
            <Card key={plan.name}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="text-center text-3xl font-bold">
                  {formatPrice(plan.price, "USD", "compact")}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </div>
                <div className="space-y-2 text-center text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <Icons.check className="h-4 w-4" aria-hidden="true" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <ManageSubscriptionForm
                  userId={user.id}
                  email={email}
                  isCurrentPlan={subscriptionPlan?.name === plan.name}
                  isPro={
                    typeof subscriptionPlan?.isPro === "boolean"
                      ? subscriptionPlan?.isPro
                      : false
                  }
                  stripePriceId={plan.stripePriceId}
                  stripeCustomerId={subscriptionPlan?.stripeCustomerId}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </Shell>
  )
}
