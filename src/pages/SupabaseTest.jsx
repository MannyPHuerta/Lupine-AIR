import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { supabaseQuery, getCurrentUser } from '@/lib/supabaseHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function SupabaseTest() {
  const [user, setUser] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test 1: Get current user
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Test 2: Query equipment table
      const equipmentData = await supabaseQuery('equipment').list('name', 10);
      setEquipment(equipmentData);
      
      // Test 3: Query customers table
      const customersData = await supabaseQuery('customers').list('created_at', 5);
      setCustomers(customersData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testInsert = async () => {
    try {
      const result = await supabaseQuery('customers').create({
        full_name: `Test Customer ${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        phone: '+1234567890',
        city: 'McAllen',
        state: 'TX',
        zip: '78501',
      });
      alert('✓ Insert successful! Created: ' + result.id);
      testConnection();
    } catch (err) {
      alert('✗ Insert failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <div className="text-lg font-semibold">Testing Supabase connection...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Supabase Connection Test</h1>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                Connection Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
              <Button onClick={testConnection} className="mt-4">Retry</Button>
            </CardContent>
          </Card>
        )}

        {!error && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Supabase Connected Successfully
              </CardTitle>
              <CardDescription>Your environment variables are configured correctly</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Auth Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Authentication
              </CardTitle>
              <CardDescription>Current user from Supabase Auth</CardDescription>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {user.full_name || 'N/A'}</div>
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>Role:</strong> <Badge>{user.role || 'user'}</Badge></div>
                  <div><strong>Branch:</strong> {user.branch || 'N/A'}</div>
                </div>
              ) : (
                <p className="text-muted-foreground">Not authenticated</p>
              )}
            </CardContent>
          </Card>

          {/* Equipment Test */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Table</CardTitle>
              <CardDescription>First 10 items from equipment table</CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.length > 0 ? (
                <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
                  {equipment.slice(0, 5).map(eq => (
                    <li key={eq.id} className="flex justify-between">
                      <span>{eq.name}</span>
                      <Badge variant="outline">${eq.daily_rate}/day</Badge>
                    </li>
                  ))}
                  {equipment.length > 5 && (
                    <li className="text-muted-foreground">...and {equipment.length - 5} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-muted-foreground">No equipment found</p>
              )}
            </CardContent>
          </Card>

          {/* Customers Test */}
          <Card>
            <CardHeader>
              <CardTitle>Customers Table</CardTitle>
              <CardDescription>First 5 customers</CardDescription>
            </CardHeader>
            <CardContent>
              {customers.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {customers.map(cust => (
                    <li key={cust.id} className="flex justify-between">
                      <span>{cust.full_name}</span>
                      <span className="text-muted-foreground">{cust.city}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No customers found</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Test Actions</CardTitle>
              <CardDescription>Try CRUD operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={testConnection} variant="outline" className="w-full">
                Refresh Data
              </Button>
              <Button onClick={testInsert} className="w-full">
                Test Insert (Create Customer)
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Migration checklist</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Supabase client configured
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Helper utilities created
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Connection verified
              </li>
              <li className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                Next: Migrate pages to use Supabase queries
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}