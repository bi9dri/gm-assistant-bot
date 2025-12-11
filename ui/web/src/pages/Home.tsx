import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Button, Spinner, Divider } from "@heroui/react";
import { api } from "../lib/orpc-client";

export function Home() {
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.health();
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold">Welcome to GM Assistant Bot</h1>
          <p className="text-default-500">A modern React SSG app with HeroUI and oRPC</p>
        </CardHeader>
        <Divider />
        <CardBody className="gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Backend API Health</h2>
            <Button
              color="primary"
              onPress={checkHealth}
              isLoading={loading}
              size="sm"
            >
              Refresh
            </Button>
          </div>

          {loading && !health && (
            <div className="flex justify-center items-center py-8">
              <Spinner size="lg" label="Checking backend status..." />
            </div>
          )}

          {error && (
            <Card className="bg-danger-50 border-danger-500">
              <CardBody>
                <p className="text-danger-700">Error: {error}</p>
              </CardBody>
            </Card>
          )}

          {health && !loading && (
            <Card className="bg-success-50 border-success-500">
              <CardBody className="gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-success-700 font-semibold">Status:</span>
                  <span className="text-success-800">{health.status.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-success-700 font-semibold">Last Check:</span>
                  <span className="text-success-800">
                    {new Date(health.timestamp).toLocaleString()}
                  </span>
                </div>
              </CardBody>
            </Card>
          )}

          <Divider />

          <div className="text-small text-default-400">
            <p>This demo showcases:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Type-safe API calls with oRPC</li>
              <li>Beautiful UI components from HeroUI</li>
              <li>Static Site Generation with Bun</li>
              <li>Cloudflare Workers deployment</li>
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
