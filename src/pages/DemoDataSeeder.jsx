import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Trash2, Users, HardHat, Package, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DemoDataSeeder() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const handleSeedDemoData = async () => {
    if (!confirm('This will DELETE all real customers, rentals, deliveries, and employees. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke('seedDemoData', {});
      setResult(response.data);
      queryClient.invalidateQueries();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Demo Data Manager</h1>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This will permanently delete all real customer data, rental records, deliveries, and employee roster.
            Only use this in demo/test environments.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Seed Demo Data</CardTitle>
            <CardDescription>
              Populate the system with fake customers, employees, and equipment for demonstration purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold">10 Customers</div>
                  <div className="text-xs text-muted-foreground">Fake profiles</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <HardHat className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold">8 Employees</div>
                  <div className="text-xs text-muted-foreground">Across branches</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Package className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold">15 Equipment</div>
                  <div className="text-xs text-muted-foreground">Various categories</div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSeedDemoData}
              disabled={loading}
              className="w-full bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Seeding Demo Data...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Real Data & Seed Demo Data
                </span>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Success!</strong> Demo data seeded successfully.
                  <div className="mt-2 text-sm space-y-1">
                    <div>• Deleted {result.deletedRealRecords} real records</div>
                    <div>• Created {result.createdCustomers} fake customers</div>
                    <div>• Created {result.createdEmployees} fake employees</div>
                    {result.createdEquipment > 0 && (
                      <div>• Created {result.createdEquipment} fake equipment items</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Gets Created</CardTitle>
            <CardDescription>Sample data that will be added to your system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Customers:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>John & Maria Rodriguez (Event planners)</li>
                <li>City of McAllen (Municipal account)</li>
                <li>ABC Construction Co. (Business account)</li>
                <li>Sarah Johnson (Party rentals)</li>
                <li>Valley Events LLC (Event rental company)</li>
                <li>Mike's Plumbing (Contractor)</li>
                <li>Guadalupe Garcia (Quinceañera)</li>
                <li>Texas Party Rentals (Subrental company)</li>
                <li>Brownsville ISD (School district)</li>
                <li>Robert Chen (Wedding planner)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Employees:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Carlos Martinez (Manager, McAllen)</li>
                <li>Jennifer Lopez (Counter Staff, McAllen)</li>
                <li>Miguel Hernandez (Driver, McAllen)</li>
                <li>Linda Garcia (Mechanic, Shop)</li>
                <li>Roberto Sanchez (Driver, Weslaco)</li>
                <li>Patricia Rivera (Counter Staff, Harlingen)</li>
                <li>David Torres (Manager, Brownsville)</li>
                <li>Elena Morales (Mechanic, Shop)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Equipment:</h4>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>20x40 Frame Tent, 200 White Chairs, 20x 6ft Tables</li>
                <li>Skid Steer S18, Mini Excavator U27</li>
                <li>Plate Compactor, Concrete Mixer, Pressure Washer</li>
                <li>And more construction/event equipment...</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}