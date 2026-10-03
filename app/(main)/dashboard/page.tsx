import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to {siteConfig.name}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Add new pages under <code>app/(main)</code> and register them in{" "}
            <code>config/navigation.ts</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
