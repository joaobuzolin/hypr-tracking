import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Search, Calendar, Filter } from "lucide-react";
import { Link } from "react-router-dom";

// Mock data para relatórios
const mockReportData = [
  {
    date: "2024-01-15",
    campaign: "Campanha Black Friday",
    event_type: "cta_click",
    count: 45,
    tag: "bf2024_cta_x9k2m"
  },
  {
    date: "2024-01-15",
    campaign: "Campanha Black Friday", 
    event_type: "pin_click",
    count: 32,
    tag: "bf2024_pin_h7n4j"
  },
  {
    date: "2024-01-14",
    campaign: "Campanha Black Friday",
    event_type: "cta_click", 
    count: 38,
    tag: "bf2024_cta_x9k2m"
  },
  {
    date: "2024-01-14",
    campaign: "Campanha Black Friday",
    event_type: "pin_click",
    count: 29,
    tag: "bf2024_pin_h7n4j"
  },
  {
    date: "2024-01-13",
    campaign: "Campanha Natal",
    event_type: "cta_click",
    count: 23,
    tag: "natal24_cta_k8j5l"
  },
  {
    date: "2024-01-13",
    campaign: "Campanha Natal",
    event_type: "pin_click", 
    count: 15,
    tag: "natal24_pin_m9p2q"
  },
  {
    date: "2024-01-12",
    campaign: "Campanha Black Friday",
    event_type: "cta_click",
    count: 52,
    tag: "bf2024_cta_x9k2m"
  },
  {
    date: "2024-01-12",
    campaign: "Campanha Black Friday",
    event_type: "pin_click",
    count: 41,
    tag: "bf2024_pin_h7n4j"
  }
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const getEventTypeLabel = (type: string) => {
  switch (type) {
    case 'cta_click': return 'CTA Click';
    case 'pin_click': return 'PIN Click';
    default: return type;
  }
};

const exportToCSV = (data: any[], filename: string) => {
  const headers = ['Data', 'Campanha', 'Tipo de Evento', 'Disparos', 'Tag'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      formatDate(row.date),
      `"${row.campaign}"`,
      getEventTypeLabel(row.event_type),
      row.count,
      row.tag
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const Reports = () => {
  const [reportData, setReportData] = useState(mockReportData);
  const [filteredData, setFilteredData] = useState(mockReportData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Listas únicas para filtros
  const campaigns = [...new Set(reportData.map(item => item.campaign))];
  const eventTypes = [...new Set(reportData.map(item => item.event_type))];

  // Aplicar filtros
  const applyFilters = () => {
    let filtered = [...reportData];

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.campaign.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCampaign !== "all") {
      filtered = filtered.filter(item => item.campaign === selectedCampaign);
    }

    if (selectedEventType !== "all") {
      filtered = filtered.filter(item => item.event_type === selectedEventType);
    }

    if (dateFrom) {
      filtered = filtered.filter(item => item.date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter(item => item.date <= dateTo);
    }

    setFilteredData(filtered);
  };

  // Aplicar filtros quando algum valor mudar
  useState(() => {
    applyFilters();
  });

  const totalDisparos = filteredData.reduce((sum, item) => sum + item.count, 0);
  const totalDias = new Set(filteredData.map(item => item.date)).size;

  const handleExportCSV = () => {
    const filename = `relatorio-campanhas-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(filteredData, filename);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">
                Relatórios
              </h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe disparos por dia e exporte dados detalhados
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/campaigns">
                <Button variant="outline" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Campanhas
                </Button>
              </Link>
              <Button onClick={handleExportCSV} className="gap-2">
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{filteredData.length}</div>
                  <div className="text-sm text-neutral-600">Registros</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{totalDisparos.toLocaleString()}</div>
                  <div className="text-sm text-neutral-600">Total Disparos</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-neutral-100 rounded">
                  <Calendar className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{totalDias}</div>
                  <div className="text-sm text-neutral-600">Dias com Dados</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Campanha ou tag..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      applyFilters();
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Campanha</Label>
                <Select value={selectedCampaign} onValueChange={(value) => {
                  setSelectedCampaign(value);
                  applyFilters();
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as campanhas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign} value={campaign}>
                        {campaign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Tipo de Evento</Label>
                <Select value={selectedEventType} onValueChange={(value) => {
                  setSelectedEventType(value);
                  applyFilters();
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {getEventTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm">Data Inicial</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    applyFilters();
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm">Data Final</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    applyFilters();
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Disparos por Dia</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[100px] text-right">Disparos</TableHead>
                    <TableHead className="w-[180px]">Tag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum dado encontrado com os filtros aplicados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {formatDate(item.date)}
                        </TableCell>
                        <TableCell>{item.campaign}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getEventTypeLabel(item.event_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.count.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-neutral-100 px-2 py-1 rounded font-mono">
                            {item.tag}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;