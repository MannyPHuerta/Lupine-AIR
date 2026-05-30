import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Save, Loader2, Bot, MessageCircle } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AITraining() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [formData, setFormData] = useState({
    module: '',
    featureName: '',
    description: '',
    workflow: [''],
    requiresCustomer: false,
    requiresSignature: false,
    requiresPayment: false,
    commonQuestions: [{ question: '', answer: '' }],
    isActive: true,
  });

  const queryClient = useQueryClient();

  const { data: features, isLoading } = useQuery({
    queryKey: ['platformFeatures'],
    queryFn: () => base44.entities.PlatformFeature.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlatformFeature.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformFeatures'] });
      setOpenDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlatformFeature.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformFeatures'] });
      setOpenDialog(false);
      setEditingFeature(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlatformFeature.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformFeatures'] });
    },
  });

  const resetForm = () => {
    setFormData({
      module: '',
      featureName: '',
      description: '',
      workflow: [''],
      requiresCustomer: false,
      requiresSignature: false,
      requiresPayment: false,
      commonQuestions: [{ question: '', answer: '' }],
      isActive: true,
    });
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature);
    setFormData({
      module: feature.module,
      featureName: feature.featureName,
      description: feature.description,
      workflow: feature.workflow || [''],
      requiresCustomer: feature.requiresCustomer || false,
      requiresSignature: feature.requiresSignature || false,
      requiresPayment: feature.requiresPayment || false,
      commonQuestions: feature.commonQuestions?.length > 0 ? feature.commonQuestions : [{ question: '', answer: '' }],
      isActive: feature.isActive ?? true,
    });
    setOpenDialog(true);
  };

  const handleSubmit = () => {
    if (editingFeature) {
      updateMutation.mutate({ id: editingFeature.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addWorkflowStep = () => {
    setFormData({ ...formData, workflow: [...formData.workflow, ''] });
  };

  const updateWorkflowStep = (index, value) => {
    const newWorkflow = [...formData.workflow];
    newWorkflow[index] = value;
    setFormData({ ...formData, workflow: newWorkflow });
  };

  const removeWorkflowStep = (index) => {
    setFormData({ ...formData, workflow: formData.workflow.filter((_, i) => i !== index) });
  };

  const addFAQ = () => {
    setFormData({ ...formData, commonQuestions: [...formData.commonQuestions, { question: '', answer: '' }] });
  };

  const updateFAQ = (index, field, value) => {
    const newFAQs = [...formData.commonQuestions];
    newFAQs[index][field] = value;
    setFormData({ ...formData, commonQuestions: newFAQs });
  };

  const removeFAQ = (index) => {
    setFormData({ ...formData, commonQuestions: formData.commonQuestions.filter((_, i) => i !== index) });
  };

  const moduleColors = {
    AIRental: 'bg-cyan-500',
    AIReports: 'bg-violet-500',
    AIRoads: 'bg-amber-500',
    AIRfq: 'bg-green-500',
    AIRepair: 'bg-red-500',
    AIRecovery: 'bg-orange-500',
    AIREvents: 'bg-pink-500',
    Admin: 'bg-slate-500',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AppPageHeader title="Train AI Assistant" subtitle="Manage the knowledge base that powers your AI Assistant" />

      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-muted-foreground">
          {features?.length || 0} features configured • {features?.reduce((acc, f) => acc + (f.commonQuestions?.length || 0), 0) || 0} FAQs
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingFeature(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Feature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFeature ? 'Edit Feature' : 'Add New Feature'}</DialogTitle>
              <DialogDescription>
                Define a platform feature and its FAQs to train the AI Assistant
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Module</Label>
                  <Input
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    placeholder="e.g. AIRental, AIReports"
                  />
                </div>
                <div>
                  <Label>Feature Name</Label>
                  <Input
                    value={formData.featureName}
                    onChange={(e) => setFormData({ ...formData, featureName: e.target.value })}
                    placeholder="e.g. Quick Sale, RFQ Manager"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this feature do?"
                  rows={3}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Workflow Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addWorkflowStep}>
                    <Plus className="w-3 h-3 mr-1" /> Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.workflow.map((step, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={step}
                        onChange={(e) => updateWorkflowStep(index, e.target.value)}
                        placeholder={`Step ${index + 1}`}
                      />
                      {formData.workflow.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeWorkflowStep(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label>Feature Requirements</Label>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.requiresCustomer}
                      onCheckedChange={(checked) => setFormData({ ...formData, requiresCustomer: checked })}
                    />
                    <Label>Requires Customer</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.requiresSignature}
                      onCheckedChange={(checked) => setFormData({ ...formData, requiresSignature: checked })}
                    />
                    <Label>Requires Signature</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.requiresPayment}
                      onCheckedChange={(checked) => setFormData({ ...formData, requiresPayment: checked })}
                    />
                    <Label>Requires Payment</Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>FAQs (Common Questions)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addFAQ}>
                    <Plus className="w-3 h-3 mr-1" /> Add FAQ
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.commonQuestions.map((faq, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <Input
                        value={faq.question}
                        onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                        placeholder="Question users might ask..."
                      />
                      <Textarea
                        value={faq.answer}
                        onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                        placeholder="How should the AI answer?"
                        rows={2}
                      />
                      {formData.commonQuestions.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFAQ(index)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t pt-4">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active (AI will use this feature)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                {editingFeature ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features?.map((feature) => (
            <Card key={feature.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge className={moduleColors[feature.module] || 'bg-slate-500'}>
                      {feature.module}
                    </Badge>
                    {feature.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(feature)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(feature.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{feature.featureName}</CardTitle>
                <CardDescription className="line-clamp-2">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <span>{feature.workflow?.length || 0} workflow steps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-3 h-3" />
                    <span>{feature.commonQuestions?.length || 0} FAQs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}