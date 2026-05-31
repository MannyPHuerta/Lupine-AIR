import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Wifi, Usb, Keyboard } from "lucide-react";
import AppPageHeader from "@/components/AppPageHeader";

export default function RFIDSettings() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  const companySettings = settings?.[0] || {};

  const updateMutation = useMutation({
    mutationFn: async (rfidOptions) => {
      if (companySettings.id) {
        return await base44.entities.CompanySettings.update(companySettings.id, {
          ...companySettings,
          rfidOptions: { ...companySettings.rfidOptions, ...rfidOptions }
        });
      } else {
        return await base44.entities.CompanySettings.create({
          rfidOptions: { ...rfidOptions }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
    },
  });

  const rfidOptions = companySettings.rfidOptions || {
    option1KeyboardEmulation: false,
    option2WebUSB: false,
    option3Bluetooth: false
  };

  const handleToggle = (option, value) => {
    updateMutation.mutate({ [option]: value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="RFID Scanner Settings"
        subtitle="Configure RFID scanner integration options"
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              RFID Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">Option 1: Keyboard Emulation (V1)</div>
                  <div className="text-sm text-blue-700">Works in all browsers - USB scanners act like keyboards</div>
                </div>
              </div>
              {rfidOptions.option1KeyboardEmulation ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Enabled
                </Badge>
              ) : (
                <Badge variant="outline">Disabled</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-300 opacity-75">
              <div className="flex items-center gap-3">
                <Usb className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">Option 2: WebUSB Direct</div>
                  <div className="text-sm text-gray-700">Chrome/Edge only - direct USB communication</div>
                </div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-300 opacity-75">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">Option 3: WebBluetooth</div>
                  <div className="text-sm text-gray-700">Wireless scanners - limited browser support</div>
                </div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Management Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-semibold">Enable Keyboard-Emulation Scanners</Label>
                  <Badge variant="outline" className="text-xs">V1</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  When enabled, counter staff can scan RFID tags to instantly find equipment. 
                  Scanners act like keyboards - just click the search box and scan.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Compatible hardware: Any USB RFID reader with keyboard-emulation mode ($50-200)
                </p>
              </div>
              <Switch
                checked={rfidOptions.option1KeyboardEmulation}
                onCheckedChange={(value) => handleToggle('option1KeyboardEmulation', value)}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between opacity-60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Enable WebUSB Direct Integration</Label>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Direct browser-to-scanner communication via USB. Chrome and Edge only.
                  </p>
                </div>
                <Switch disabled={true} />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between opacity-60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">Enable WebBluetooth Scanners</Label>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Wireless Bluetooth RFID scanners. Limited browser support.
                  </p>
                </div>
                <Switch disabled={true} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Guide (Option 1)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
                <div>
                  <div className="font-medium">Add RFID tags to equipment</div>
                  <p className="text-gray-600">Attach RFID labels to equipment and record tag IDs in Equipment.rfidTag field</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
                <div>
                  <div className="font-medium">Purchase USB RFID scanners</div>
                  <p className="text-gray-600">Recommended: UHF RFID handheld readers with keyboard-emulation mode ($50-200 on Amazon)</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">3</div>
                <div>
                  <div className="font-medium">Train counter staff</div>
                  <p className="text-gray-600">Click equipment search → scan tag → equipment auto-populates. No special software needed.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}