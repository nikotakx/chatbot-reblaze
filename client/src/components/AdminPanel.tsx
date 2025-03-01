import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DocumentationFile, RepositoryConfig, DocumentationStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { FileText, Image, FileCode, File, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface AdminPanelProps {
  className?: string;
}

export default function AdminPanel({ className = "" }: AdminPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<DocumentationFile | null>(null);

  // Get repository configuration
  const { data: repoData, isLoading: isLoadingRepo } = useQuery({
    queryKey: ["/api/admin/repository"],
  });

  // Get documentation files
  const { data: docsData, isLoading: isLoadingDocs } = useQuery({
    queryKey: ["/api/admin/documentation"],
  });

  // Get documentation stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Set up repository config mutation
  const configMutation = useMutation({
    mutationFn: async (data: { url: string; branch: string }) => {
      const response = await apiRequest("POST", "/api/admin/repository", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Repository configuration updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/repository"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update repository configuration",
        variant: "destructive",
      });
      console.error("Failed to update repository configuration:", error);
    }
  });

  // Set up repository refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async (data: { url: string; branch: string }) => {
      const response = await apiRequest("POST", "/api/admin/refresh", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Documentation refreshed: ${data.filesProcessed} files processed with ${data.imagesProcessed} images`,
      });
      
      // Invalidate all admin queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to refresh documentation",
        variant: "destructive",
      });
      console.error("Failed to refresh documentation:", error);
    }
  });

  // Get selected file details
  const { data: fileDetailsData, isLoading: isLoadingFileDetails } = useQuery({
    queryKey: selectedFile ? [`/api/admin/documentation/${selectedFile.id}`] : [],
    enabled: !!selectedFile,
  });

  // Initialize form with repository data
  useEffect(() => {
    if (repoData?.config) {
      setRepoUrl(repoData.config.url);
      setBranch(repoData.config.branch);
    }
  }, [repoData]);

  // Handle connect repository
  const handleConnectRepository = () => {
    configMutation.mutate({ url: repoUrl, branch });
  };

  // Handle refresh repository
  const handleRefreshRepository = () => {
    refreshMutation.mutate({ url: repoUrl, branch });
  };

  // Filter documentation files based on search query
  const filteredFiles = docsData?.files?.filter((file: DocumentationFile) => 
    file.path.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Format time for display
  const formatTime = (timeString: string | null) => {
    if (!timeString) return "Never";
    try {
      return formatDistanceToNow(new Date(timeString), { addSuffix: true });
    } catch (e) {
      return "Unknown";
    }
  };

  const stats: DocumentationStats = statsData || {
    fileCount: 0,
    chunkCount: 0,
    imageCount: 0,
    lastSynced: null
  };

  // Prepare data for visualizations
  const contentDistribution = useMemo(() => {
    if (!stats) return [];
    
    return [
      { name: 'Files', value: stats.fileCount, color: '#4f46e5' },
      { name: 'Chunks', value: stats.chunkCount, color: '#10b981' },
      { name: 'Images', value: stats.imageCount, color: '#f59e0b' }
    ];
  }, [stats]);

  // Calculate coverage ratio for progress bar
  const contentCoverage = useMemo(() => {
    if (!stats || stats.fileCount === 0) return 0;
    return Math.min(100, Math.round((stats.chunkCount / (stats.fileCount * 3)) * 100));
  }, [stats]);

  // Calculate file extension distribution
  const fileExtensions = useMemo(() => {
    if (!docsData?.files) return [];
    
    const extensions: Record<string, number> = {};
    
    docsData.files.forEach((file: DocumentationFile) => {
      const ext = file.path.split('.').pop() || 'unknown';
      extensions[ext] = (extensions[ext] || 0) + 1;
    });
    
    return Object.entries(extensions).map(([name, value]) => ({
      name,
      value,
      color: name === 'md' ? '#4f46e5' : 
             name === 'txt' ? '#10b981' : 
             name === 'json' ? '#f59e0b' : 
             name === 'html' ? '#ef4444' : '#6b7280'
    }));
  }, [docsData]);

  // Get repository status
  const repoStatus = useMemo(() => {
    if (isLoadingRepo) return 'loading';
    if (!repoData?.config) return 'not-configured';
    return 'configured';
  }, [isLoadingRepo, repoData]);

  return (
    <aside className={`w-96 bg-white border-l border-gray-200 h-full overflow-y-auto ${className}`}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Admin Controls</h2>
        
        {/* Repository Status */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-secondary-700 uppercase tracking-wider">
              Repository Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {repoStatus === 'configured' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected to GitHub</p>
                    <p className="text-sm text-secondary-500">
                      {repoData?.config?.url} ({repoData?.config?.branch})
                    </p>
                    <p className="text-xs text-secondary-400 mt-1">
                      Last synced: {formatTime(stats.lastSynced)}
                    </p>
                  </div>
                </>
              ) : repoStatus === 'loading' ? (
                <>
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                  <p className="font-medium">Checking repository status...</p>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-orange-500" />
                  <p className="font-medium">Not connected to a repository</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Repository Settings */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider mb-3">Repository Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1" htmlFor="repoUrl">
                GitHub Repository URL
              </label>
              <Input 
                type="text" 
                id="repoUrl" 
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/docs-repo"
                disabled={configMutation.isPending || refreshMutation.isPending}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1" htmlFor="branchName">
                Branch
              </label>
              <Select 
                value={branch} 
                onValueChange={setBranch}
                disabled={configMutation.isPending || refreshMutation.isPending}
              >
                <SelectTrigger id="branchName">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">main</SelectItem>
                  <SelectItem value="master">master</SelectItem>
                  <SelectItem value="develop">develop</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                className="flex-1"
                onClick={handleConnectRepository}
                disabled={!repoUrl || configMutation.isPending}
              >
                {configMutation.isPending ? "Connecting..." : "Connect Repository"}
              </Button>
              <Button 
                className="flex-1" 
                variant="outline"
                onClick={handleRefreshRepository}
                disabled={!repoUrl || refreshMutation.isPending}
              >
                {refreshMutation.isPending ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Documentation Content */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider mb-3">Documentation Content</h3>
          
          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-secondary-500">Files Indexed</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-lg font-semibold text-secondary-900">{stats.fileCount}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <FileCode className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-secondary-500">Text Chunks</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-lg font-semibold text-secondary-900">{stats.chunkCount}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Image className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-xs text-secondary-500">Image References</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-lg font-semibold text-secondary-900">{stats.imageCount}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm border border-gray-100">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-secondary-500">Last Updated</p>
                    {isLoadingStats ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <p className="text-base font-semibold text-secondary-900">{formatTime(stats.lastSynced)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Content Coverage */}
          <Card className="mb-4 bg-white shadow-sm border border-gray-100">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium">Content Coverage</h4>
                <Badge variant={contentCoverage > 70 ? "secondary" : contentCoverage > 30 ? "outline" : "destructive"}>
                  {contentCoverage}%
                </Badge>
              </div>
              <Progress value={contentCoverage} className="h-2" />
              <p className={`text-xs mt-2 ${
                contentCoverage > 70 ? "text-green-600" : 
                contentCoverage > 30 ? "text-amber-600" : 
                "text-red-600"
              }`}>
                {contentCoverage > 70 ? "Good coverage" : contentCoverage > 30 ? "Moderate coverage" : "Low coverage"}
              </p>
            </CardContent>
          </Card>
          
          {/* Content Distribution */}
          {!isLoadingStats && stats.fileCount + stats.chunkCount + stats.imageCount > 0 && (
            <Card className="mb-4 bg-white shadow-sm border border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Content Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contentDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {contentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* File Extensions (when files exist) */}
          {!isLoadingDocs && fileExtensions.length > 0 && (
            <Card className="mb-4 bg-white shadow-sm border border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">File Types</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={fileExtensions}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {fileExtensions.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Content Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-1" htmlFor="contentSearch">
              Search Content
            </label>
            <div className="relative">
              <Input 
                type="text" 
                id="contentSearch" 
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for documentation files..."
              />
              <div className="absolute left-2.5 top-2.5 text-gray-400">
                <i className="fas fa-search text-sm"></i>
              </div>
            </div>
          </div>
          
          {/* File list */}
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {isLoadingDocs ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredFiles.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredFiles.map((file: DocumentationFile) => (
                    <li 
                      key={file.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedFile?.id === file.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-secondary-900">{file.path}</span>
                          <span className="text-xs text-secondary-500">
                            {formatTime(file.lastUpdated)}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-600 mt-1 truncate">
                          {file.content.substring(0, 50)}...
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-secondary-500">
                  {docsData?.files?.length === 0 
                    ? "No documentation files found. Try refreshing the repository." 
                    : "No files match your search."}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Markdown Preview */}
        <div>
          <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider mb-3">
            Selected Document Preview
          </h3>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            {selectedFile ? (
              <>
                <div className="bg-gray-50 p-3 flex justify-between items-center">
                  <span className="font-medium text-sm">{selectedFile.path}</span>
                  <div className="flex space-x-1">
                    <a 
                      href={selectedFile.githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-secondary-600 hover:text-secondary-900 p-1"
                    >
                      <i className="fas fa-edit text-sm"></i>
                    </a>
                    <button 
                      className="text-secondary-600 hover:text-secondary-900 p-1"
                      onClick={() => handleRefreshRepository()}
                    >
                      <i className="fas fa-sync text-sm"></i>
                    </button>
                  </div>
                </div>
                
                <div className="p-4 max-h-64 overflow-y-auto bg-white prose prose-sm">
                  {isLoadingFileDetails ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <MarkdownRenderer content={selectedFile.content} />
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-secondary-500">
                Select a document to preview its content
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
