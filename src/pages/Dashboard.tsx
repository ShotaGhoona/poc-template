import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Users, Package, TrendingUp } from "lucide-react";

const kpiCards = [
  {
    title: "Total Items",
    value: "0",
    description: "Active items in the system",
    icon: Package,
  },
  {
    title: "Active Users",
    value: "1",
    description: "Currently active",
    icon: Users,
  },
  {
    title: "Activity",
    value: "0",
    description: "Actions this week",
    icon: Activity,
  },
  {
    title: "Growth",
    value: "0%",
    description: "Since last month",
    icon: TrendingUp,
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user?.email ? `, ${user.email}` : ""}!`}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
