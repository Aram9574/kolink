"use client";

import { logger } from '@/lib/logger';
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import { ProfileAvatarMenu } from "@/components/ProfileAvatarMenu";
import {
  Shield,
  Users,
  Edit2,
  Trash2,
  Plus,
  History,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface User {
  id: string;
  email: string;
  plan: string;
  credits: number;
  role: string;
  last_login: string | null;
  created_at: string;
  posts_generated: number;
  credits_used: number;
  last_activity: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  admin: { id: string; email: string };
  target_user: { id: string; email: string } | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    plan: "",
    credits: 0,
    role: "",
  });

  // Bulk embeddings state
  const [embeddingLimit, setEmbeddingLimit] = useState(50);
  const [embeddingInProgress, setEmbeddingInProgress] = useState(false);
  const [embeddingResult, setEmbeddingResult] = useState<{
    processed: number;
    errors: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
      setSession(currentSession);
      if (currentSession) {
        checkAdminAccess();
      } else {
        // No session - redirect to signin
        router.push("/signin");
        setLoading(false);
      }
    };
    initSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.plan.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const checkAdminAccess = async () => {
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        router.push("/signin");
        return;
      }

      // Check if user has admin role
      const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (error || !profile || profile.role !== "admin") {
        toast.error("Access denied: Admin privileges required");
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (error) {
      logger.error("Admin access check error:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
    } catch (error) {
      logger.error("Error fetching users:", error);
      toast.error("Failed to load users");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/admin/audit-logs?limit=50", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setAuditLogs(data.logs);
    } catch (error) {
      logger.error("Error fetching audit logs:", error);
      toast.error("Failed to load audit logs");
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      plan: user.plan,
      credits: user.credits,
      role: user.role,
    });
    setEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const confirmEdit = async () => {
    if (!selectedUser) return;

    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          updates: editForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      toast.success("User updated successfully");
      setEditModalOpen(false);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (error) {
      logger.error("Error updating user:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update user";
      toast.error(errorMessage);
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: selectedUser.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      toast.success("User deleted successfully");
      setDeleteModalOpen(false);
      await fetchUsers();
      await fetchAuditLogs();
    } catch (error) {
      logger.error("Error deleting user:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
      toast.error(errorMessage);
    }
  };

  const handleRunBulkEmbeddings = async () => {
    setEmbeddingInProgress(true);
    setEmbeddingResult(null);

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        toast.error("No session found");
        return;
      }

      const response = await fetch("/api/admin/bulk-embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          limit: embeddingLimit,
          skipExisting: true,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setEmbeddingResult({
          processed: data.processed,
          errors: data.errors,
          total: data.total,
        });
        toast.success(`Successfully processed ${data.processed} embeddings`);
      } else {
        toast.error(data.error || "Failed to generate embeddings");
      }
    } catch (error) {
      logger.error("Bulk embeddings error:", error);
      toast.error("Error generating embeddings");
    } finally {
      setEmbeddingInProgress(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "premium":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
      case "standard":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "basic":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === "admin"
      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Navbar session={session} />
      <ProfileAvatarMenu />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">
                Admin Panel
              </h1>
              <p className="text-muted-light dark:text-muted-dark">
                Manage users and monitor system activity
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <History className="w-4 h-4" />
            {showAuditLogs ? "Hide" : "View"} Audit Logs
            {showAuditLogs ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-light dark:text-muted-dark">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {users.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-light dark:text-muted-dark">
                  Premium Users
                </p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {users.filter((u) => u.plan === "premium").length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-light dark:text-muted-dark">
                  Total Posts
                </p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {users.reduce((acc, u) => acc + u.posts_generated, 0)}
                </p>
              </div>
              <Plus className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-light dark:text-muted-dark">
                  Credits Used
                </p>
                <p className="text-2xl font-bold text-text-light dark:text-text-dark">
                  {users.reduce((acc, u) => acc + u.credits_used, 0)}
                </p>
              </div>
              <History className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Bulk Embeddings Tool */}
        <div className="mb-8 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6">
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">
            Bulk Embedding Generator
          </h2>
          <p className="text-sm text-muted-light dark:text-muted-dark mb-4">
            Generate embeddings for inspiration posts to improve semantic search performance
          </p>

          <div className="flex items-end gap-4 mb-4">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Number of posts to process
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={embeddingLimit}
                onChange={(e) => setEmbeddingLimit(parseInt(e.target.value) || 50)}
                className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark"
                disabled={embeddingInProgress}
              />
            </div>

            <button
              onClick={handleRunBulkEmbeddings}
              disabled={embeddingInProgress}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {embeddingInProgress ? "Processing..." : "Generate Embeddings"}
            </button>
          </div>

          {embeddingResult && (
            <div className="p-4 bg-background-light dark:bg-background-dark rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{embeddingResult.processed}</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Processed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{embeddingResult.errors}</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Errors</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{embeddingResult.total}</p>
                  <p className="text-sm text-muted-light dark:text-muted-dark">Total</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs Section */}
        {showAuditLogs && (
          <div className="mb-8 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6">
            <h2 className="text-xl font-bold text-text-light dark:text-text-dark mb-4">
              Recent Audit Logs
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-background-light dark:bg-background-dark rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-light dark:text-text-dark">
                      {log.admin.email} performed{" "}
                      <span className="text-primary">{log.action}</span>
                      {log.target_user && (
                        <>
                          {" "}
                          on <span className="font-semibold">{log.target_user.email}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-light dark:text-muted-dark">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-light dark:text-muted-dark" />
            <input
              type="text"
              placeholder="Search by email, plan, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark placeholder-muted-light dark:placeholder-muted-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
                    Posts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-light dark:text-muted-dark uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-background-light dark:hover:bg-background-dark transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text-light dark:text-text-dark">
                        {user.email}
                      </div>
                      <div className="text-xs text-muted-light dark:text-muted-dark">
                        Joined {formatDate(user.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanBadgeColor(
                          user.plan
                        )}`}
                      >
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {user.credits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light dark:text-text-dark">
                      {user.posts_generated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-light dark:text-muted-dark">
                      {formatDate(user.last_activity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-light dark:text-muted-dark mx-auto mb-4" />
              <p className="text-text-light dark:text-text-dark">
                No users found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Plan
              </label>
              <select
                value={editForm.plan}
                onChange={(e) =>
                  setEditForm({ ...editForm, plan: e.target.value })
                }
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Credits
              </label>
              <input
                type="number"
                value={editForm.credits}
                onChange={(e) =>
                  setEditForm({ ...editForm, credits: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmEdit}
                className="flex-1 px-4 py-2 bg-primary text-background-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.email}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-6">
            <button
              onClick={confirmDelete}
              className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete User
            </button>
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
