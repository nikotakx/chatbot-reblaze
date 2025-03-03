import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DocumentationFile, DocumentationStats } from "@/lib/types";
import {
  ChatAnalytics,
  ChatSessions,
  RepositoryData,
  DocumentationData,
} from "@/lib/interfaces";
import useWebSocket from "@/hooks/use-websocket";
import RealtimeStatus from "./RealtimeStatus";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText,
  Image,
  File,
  RefreshCw,
  CheckCircle,
  XCircle,
  MessageSquare,
  Database,
  BarChart2,
  Users,
  Clock,
  Trash2,
  Download,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface AdminPanelProps {
  className?: string;
}

export default function AdminPanel({ className = "" }: AdminPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main"); // Default to main instead of hardcoded v2.x
  const [searchQuery, setSearchQuery] = useState("");
  // Add state for custom branch input
  const [isCustomBranch, setIsCustomBranch] = useState(false);
  const [customBranch, setCustomBranch] = useState("");
  const [selectedFile, setSelectedFile] = useState<DocumentationFile | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("documentation");

  // Get repository configuration
  const { data: repoData, isLoading: isLoadingRepo } = useQuery<RepositoryData>(
    {
      queryKey: ["/api/admin/repository"],
    },
  );

  // Get documentation files
  const { data: docsData, isLoading: isLoadingDocs } =
    useQuery<DocumentationData>({
      queryKey: ["/api/admin/documentation"],
    });

  // Get documentation stats
  const { data: statsData, isLoading: isLoadingStats } =
    useQuery<DocumentationStats>({
      queryKey: ["/api/admin/stats"],
    });

  // Get chat sessions
  const { data: chatSessionsData, isLoading: isLoadingChatSessions } =
    useQuery<ChatSessions>({
      queryKey: ["/api/admin/chats"],
      enabled: activeTab === "chats",
    });

  // Get chat analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } =
    useQuery<ChatAnalytics>({
      queryKey: ["/api/admin/analytics"],
      enabled: activeTab === "analytics",
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
    },
  });

  // State for tracking refresh progress
  const [refreshProgress, setRefreshProgress] = useState({
    isRefreshing: false,
    filesProcessed: 0,
    totalFiles: 0,
  });

  // Set up repository refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async (data: { url: string; branch: string }) => {
      setRefreshProgress({
        isRefreshing: true,
        filesProcessed: 0,
        totalFiles: 100, // Initial estimate
      });

      // Start a periodic check for updated stats
      const checkInterval = setInterval(async () => {
        try {
          // Poll for updated stats to track progress
          const statsResponse = await apiRequest("GET", "/api/admin/stats");
          const statsData = await statsResponse.json();

          if (statsData && statsData.fileCount > 0) {
            setRefreshProgress((prev) => ({
              ...prev,
              filesProcessed: statsData.fileCount,
              totalFiles: Math.max(prev.totalFiles, statsData.fileCount + 10), // Adjust total estimate
            }));
          }
        } catch (e) {
          console.log("Error polling stats:", e);
        }
      }, 3000);

      try {
        // Make the actual refresh request
        const response = await apiRequest("POST", "/api/admin/refresh", data);
        const result = await response.json();

        // Clear the polling interval
        clearInterval(checkInterval);

        // Reset refresh progress
        setRefreshProgress({
          isRefreshing: false,
          filesProcessed: result.filesProcessed || 0,
          totalFiles: result.filesProcessed || 0,
        });

        return result;
      } catch (error) {
        // Clear the polling interval on error
        clearInterval(checkInterval);

        // Reset refresh progress
        setRefreshProgress({
          isRefreshing: false,
          filesProcessed: 0,
          totalFiles: 0,
        });

        throw error;
      }
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
        description: "Failed to refresh documentation. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to refresh documentation:", error);
    },
  });

  // Get selected file details
  const { data: fileDetailsData, isLoading: isLoadingFileDetails } = useQuery({
    queryKey: selectedFile
      ? [`/api/admin/documentation/${selectedFile.id}`]
      : [],
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
  const filteredFiles =
    docsData?.files?.filter((file: DocumentationFile) =>
      file.path.toLowerCase().includes(searchQuery.toLowerCase()),
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
    lastSynced: null,
  };

  // Get repository status
  const repoStatus = isLoadingRepo
    ? "loading"
    : repoData?.config
      ? "configured"
      : "not-configured";

  // Handle chat message deletion
  const deleteChatMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/chat/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chat message deleted successfully",
      });
      // Invalidate chat sessions query
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete chat message",
        variant: "destructive",
      });
      console.error("Failed to delete chat message:", error);
    },
  });

  return (
    <aside
      className={`w-1/2 bg-white border-l border-gray-200 h-full overflow-y-auto ${className}`}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-secondary-900">
            Admin Controls
          </h2>
          <RealtimeStatus />
        </div>

        {/* Admin Tabs */}
        <Tabs
          defaultValue={activeTab}
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="documentation" className="text-xs">
              <FileText className="h-4 w-4 mr-1" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">
              <BarChart2 className="h-4 w-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="chats" className="text-xs">
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat Logs
            </TabsTrigger>
          </TabsList>

          {/* Documentation Tab Content */}
          <TabsContent value="documentation">
            {/* Repository Status */}
            <Card className="mb-8">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-secondary-700 uppercase tracking-wider">
                  Repository Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {repoStatus === "configured" ? (
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
                  ) : repoStatus === "loading" ? (
                    <>
                      <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                      <p className="font-medium">
                        Checking repository status...
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-orange-500" />
                      <p className="font-medium">
                        Not connected to a repository
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Repository Settings */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider mb-3">
                Repository Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium text-secondary-700 mb-1"
                    htmlFor="repoUrl"
                  >
                    GitHub Repository URL
                  </label>
                  <Input
                    type="text"
                    id="repoUrl"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/docs-repo"
                    disabled={
                      configMutation.isPending || refreshMutation.isPending
                    }
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-secondary-700 mb-1"
                    htmlFor="branchName"
                  >
                    Branch
                  </label>
                  
                  {!isCustomBranch ? (
                    <div className="space-y-2">
                      <Select
                        value={branch}
                        onValueChange={setBranch}
                        disabled={
                          configMutation.isPending || refreshMutation.isPending
                        }
                      >
                        <SelectTrigger id="branchName">
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">main</SelectItem>
                          <SelectItem value="master">master</SelectItem>
                          <SelectItem value="develop">develop</SelectItem>
                          <SelectItem value="custom">Custom branch...</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {branch === "custom" && (
                        <Input 
                          type="text"
                          placeholder="Enter custom branch name"
                          value={customBranch}
                          onChange={(e) => {
                            setCustomBranch(e.target.value);
                            if (e.target.value) {
                              setBranch(e.target.value);
                            }
                          }}
                          disabled={configMutation.isPending || refreshMutation.isPending}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        id="customBranch"
                        value={customBranch}
                        onChange={(e) => {
                          setCustomBranch(e.target.value);
                          setBranch(e.target.value);
                        }}
                        placeholder="Enter branch name"
                        disabled={configMutation.isPending || refreshMutation.isPending}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsCustomBranch(false);
                          setBranch("main");
                        }}
                        disabled={configMutation.isPending || refreshMutation.isPending}
                      >
                        Use common branch
                      </Button>
                    </div>
                  )}
                  
                  {!isCustomBranch && branch !== "custom" && (
                    <Button
                      variant="link"
                      className="text-xs p-0 h-auto mt-1"
                      onClick={() => {
                        setIsCustomBranch(true);
                        setCustomBranch(branch);
                      }}
                      disabled={configMutation.isPending || refreshMutation.isPending}
                    >
                      Use custom branch name
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button
                      className="flex-1"
                      onClick={handleConnectRepository}
                      disabled={
                        !repoUrl ||
                        configMutation.isPending ||
                        refreshMutation.isPending ||
                        refreshProgress.isRefreshing
                      }
                    >
                      {configMutation.isPending
                        ? "Connecting..."
                        : "Connect Repository"}
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={handleRefreshRepository}
                      disabled={
                        !repoUrl ||
                        refreshMutation.isPending ||
                        refreshProgress.isRefreshing
                      }
                    >
                      {refreshMutation.isPending ||
                      refreshProgress.isRefreshing ? (
                        <span className="flex items-center">
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Refreshing...
                        </span>
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>

                  {/* Refresh Progress Indicator */}
                  {refreshProgress.isRefreshing && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span>Processing documentation files</span>
                        <span>
                          {refreshProgress.filesProcessed} /{" "}
                          {refreshProgress.totalFiles} files
                        </span>
                      </div>
                      <Progress
                        value={Math.min(
                          100,
                          (refreshProgress.filesProcessed /
                            refreshProgress.totalFiles) *
                            100,
                        )}
                        className="h-1"
                      />
                      <p className="text-xs text-secondary-500 italic">
                        This may take a few minutes for large repositories
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Documentation Content */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-secondary-700 uppercase tracking-wider mb-3">
                Documentation Content
              </h3>

              {/* Enhanced Statistics Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card className="bg-white shadow-sm border border-gray-100">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-secondary-500">
                          Files Indexed
                        </p>
                        {isLoadingStats ? (
                          <Skeleton className="h-6 w-12" />
                        ) : (
                          <p className="text-lg font-semibold text-secondary-900">
                            {stats.fileCount}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border border-gray-100">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-xs text-secondary-500">
                          Text Chunks
                        </p>
                        {isLoadingStats ? (
                          <Skeleton className="h-6 w-12" />
                        ) : (
                          <p className="text-lg font-semibold text-secondary-900">
                            {stats.chunkCount}
                          </p>
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
                        <p className="text-xs text-secondary-500">
                          Image References
                        </p>
                        {isLoadingStats ? (
                          <Skeleton className="h-6 w-12" />
                        ) : (
                          <p className="text-lg font-semibold text-secondary-900">
                            {stats.imageCount}
                          </p>
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
                        <p className="text-xs text-secondary-500">
                          Last Updated
                        </p>
                        {isLoadingStats ? (
                          <Skeleton className="h-6 w-24" />
                        ) : (
                          <p className="text-base font-semibold text-secondary-900">
                            {formatTime(stats.lastSynced)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Content Search */}
              <div className="mb-4">
                <label
                  className="block text-sm font-medium text-secondary-700 mb-1"
                  htmlFor="contentSearch"
                >
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
                          className={`hover:bg-gray-50 cursor-pointer ${selectedFile?.id === file.id ? "bg-blue-50" : ""}`}
                          onClick={() => setSelectedFile(file)}
                        >
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-secondary-900">
                                {file.path.split("/").pop()}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0"
                              >
                                {file.path.split(".").pop()}
                              </Badge>
                            </div>
                            <div className="flex items-center mt-1 text-xs text-secondary-500">
                              <div className="flex items-center mr-3">
                                <FileText className="h-3 w-3 mr-1" />
                                <span>{file.content.length} chars</span>
                              </div>
                              {file.hasImages && (
                                <div className="flex items-center">
                                  <Image className="h-3 w-3 mr-1" />
                                  <span>Has images</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-secondary-500">
                      {searchQuery
                        ? "No files match your search"
                        : "No documentation files available"}
                    </div>
                  )}
                </div>
              </div>

              {/* File preview */}
              <div className="mt-6 border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-50 p-2 border-b border-gray-200">
                  <h4 className="text-sm font-medium">File Preview</h4>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  {selectedFile ? (
                    <div>
                      <div className="mb-4">
                        <Badge variant="outline" className="mb-2">
                          {selectedFile.path}
                        </Badge>
                        {selectedFile.githubUrl && (
                          <a
                            href={selectedFile.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center mt-1"
                          >
                            <File className="h-3 w-3 mr-1" />
                            View on GitHub
                          </a>
                        )}
                      </div>

                      {isLoadingFileDetails ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-5/6" />
                          <Skeleton className="h-32 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      ) : (
                        <MarkdownRenderer content={selectedFile.content} />
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-secondary-500">
                      Select a document to preview its content
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab Content */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usage Analytics</CardTitle>
                  <CardDescription>
                    Overview of chatbot usage and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAnalytics ? (
                    <div className="space-y-4">
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-40 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : analyticsData ? (
                    <div className="space-y-6">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-secondary-500">
                                  Total Sessions
                                </p>
                                <p className="text-2xl font-bold">
                                  {analyticsData.summary?.totalSessions || 0}
                                </p>
                              </div>
                              <Users className="h-8 w-8 text-blue-500 opacity-75" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-secondary-500">
                                  Total Queries
                                </p>
                                <p className="text-2xl font-bold">
                                  {analyticsData.summary?.totalQueries || 0}
                                </p>
                              </div>
                              <MessageSquare className="h-8 w-8 text-green-500 opacity-75" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-secondary-500">
                                  Avg. Response Time
                                </p>
                                <p className="text-2xl font-bold">0.8s</p>
                              </div>
                              <Clock className="h-8 w-8 text-amber-500 opacity-75" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-secondary-500">
                                  Est. Tokens Used
                                </p>
                                <p className="text-2xl font-bold">
                                  {analyticsData.summary?.estimatedTokens?.total?.toLocaleString() ||
                                    0}
                                </p>
                              </div>
                              <Database className="h-8 w-8 text-purple-500 opacity-75" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Usage Over Time */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            Daily Query Volume
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                          <div className="h-[200px]">
                            {analyticsData.timeSeries &&
                            analyticsData.timeSeries.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={analyticsData.timeSeries}
                                  margin={{
                                    top: 5,
                                    right: 5,
                                    left: 5,
                                    bottom: 20,
                                  }}
                                >
                                  <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(date) =>
                                      format(new Date(date), "MMM d")
                                    }
                                  />
                                  <YAxis allowDecimals={false} />
                                  <Tooltip
                                    formatter={(value: any) => [value, "Count"]}
                                    labelFormatter={(date) =>
                                      format(new Date(date), "MMMM d, yyyy")
                                    }
                                  />
                                  <Legend />
                                  <Line
                                    type="monotone"
                                    dataKey="queries"
                                    stroke="#4f46e5"
                                    name="User Queries"
                                    strokeWidth={2}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="responses"
                                    stroke="#10b981"
                                    name="AI Responses"
                                    strokeWidth={2}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-full flex items-center justify-center text-secondary-400">
                                No time-series data available
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Popular Query Terms */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            Popular Query Terms
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {analyticsData.topQueryTerms &&
                          analyticsData.topQueryTerms.length > 0 ? (
                            <div className="space-y-2">
                              {analyticsData.topQueryTerms.map(
                                (item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center"
                                  >
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        {item.term}
                                      </p>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="text-sm text-secondary-600 mr-2">
                                        {item.count}
                                      </span>
                                      <div className="w-24 bg-secondary-100 rounded-full h-2">
                                        <div
                                          className="bg-blue-500 h-2 rounded-full"
                                          style={{
                                            width: `${Math.min(100, (item.count / analyticsData.topQueryTerms[0].count) * 100)}%`,
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-secondary-400 py-4">
                              No query terms data available
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-secondary-500">
                      No analytics data available yet. Usage data will appear
                      here as users interact with the chatbot.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Chat Logs Tab Content */}
          <TabsContent value="chats">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chat Sessions</CardTitle>
                <CardDescription>View and manage chat history</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingChatSessions ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : chatSessionsData?.sessions &&
                  chatSessionsData.sessions.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Session ID</TableHead>
                          <TableHead>Messages</TableHead>
                          <TableHead>Last Activity</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chatSessionsData.sessions.map((session) => (
                          <TableRow key={session.sessionId}>
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                                <span
                                  className="text-xs truncate max-w-[80px]"
                                  title={session.sessionId}
                                >
                                  {session.sessionId.substring(0, 8)}...
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{session.messageCount}</TableCell>
                            <TableCell>
                              {formatTime(session.lastActivity)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  // Create a download link for the session chat log
                                  const chatData = {
                                    sessionId: session.sessionId,
                                    messageCount: session.messageCount,
                                    startTime: session.startTime,
                                    lastActivity: session.lastActivity,
                                    downloadDate: new Date().toISOString(),
                                    format: "json"
                                  };
                                  
                                  // Create a blob and download link
                                  const blob = new Blob(
                                    [JSON.stringify(chatData, null, 2)], 
                                    { type: "application/json" }
                                  );
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `chat-session-${session.sessionId.substring(0, 8)}.json`;
                                  document.body.appendChild(a);
                                  a.click();
                                  
                                  // Clean up
                                  setTimeout(() => {
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  }, 0);
                                  
                                  toast({
                                    title: "Chat Log Downloaded",
                                    description: `Session ${session.sessionId.substring(0, 8)}... has been downloaded.`,
                                  });
                                }}
                              >
                                <span className="sr-only">Download Chat Log</span>
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex justify-between items-center mt-4 text-xs text-secondary-500">
                      <span>
                        Showing {chatSessionsData.sessions.length} chat sessions
                      </span>

                      <Button variant="outline" size="sm" disabled>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-secondary-500">
                    No chat sessions available yet. Sessions will appear here as
                    users interact with the chatbot.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
