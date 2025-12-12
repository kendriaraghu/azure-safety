"use client";

import { useState, useEffect } from "react";

interface AdminAuthManagementProps {
  addAdmin: (address: string) => Promise<boolean>;
  removeAdmin: (address: string) => Promise<boolean>;
  getAuthorizedAdmins: () => Promise<string[]>;
}

export function AdminAuthManagement({
  addAdmin,
  removeAdmin,
  getAuthorizedAdmins,
}: AdminAuthManagementProps) {
  const [newAdminAddress, setNewAdminAddress] = useState<string>("");
  const [removeAdminAddress, setRemoveAdminAddress] = useState<string>("");
  const [adminList, setAdminList] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const admins = await getAuthorizedAdmins();
      setAdminList(admins);
    } catch (e) {
      console.error("Error loading admins:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddAdmin = async () => {
    if (!newAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(newAdminAddress)) {
      setMessage("Error: Please enter a valid Ethereum address");
      return;
    }

    setIsAdding(true);
    setMessage("Adding admin...");
    const success = await addAdmin(newAdminAddress);
    setIsAdding(false);
    if (success) {
      setMessage("Admin added successfully!");
      setNewAdminAddress("");
      await loadAdmins();
    } else {
      setMessage("Error: Failed to add admin");
    }
  };

  const handleRemoveAdmin = async () => {
    if (!removeAdminAddress || !/^0x[a-fA-F0-9]{40}$/.test(removeAdminAddress)) {
      setMessage("Error: Please enter a valid Ethereum address");
      return;
    }

    setIsRemoving(true);
    setMessage("Removing admin...");
    const success = await removeAdmin(removeAdminAddress);
    setIsRemoving(false);
    if (success) {
      setMessage("Admin removed successfully!");
      setRemoveAdminAddress("");
      await loadAdmins();
    } else {
      setMessage("Error: Failed to remove admin");
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-semibold mb-3">Add Admin</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newAdminAddress}
            onChange={(e) => setNewAdminAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            disabled={isAdding}
          />
          <button
            onClick={handleAddAdmin}
            disabled={isAdding || !newAdminAddress}
            className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#28A745" }}
          >
            {isAdding ? "Adding..." : "Add Admin"}
          </button>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-semibold mb-3">Remove Admin</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={removeAdminAddress}
            onChange={(e) => setRemoveAdminAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            disabled={isRemoving}
          />
          <button
            onClick={handleRemoveAdmin}
            disabled={isRemoving || !removeAdminAddress}
            className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#DC3545" }}
          >
            {isRemoving ? "Removing..." : "Remove Admin"}
          </button>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Authorized Admins</h3>
          <button
            onClick={loadAdmins}
            disabled={isLoading}
            className="px-3 py-1 text-sm text-white rounded hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#0078D4" }}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {adminList.length > 0 ? (
          <div className="space-y-2">
            {adminList.map((admin, index) => (
              <div
                key={index}
                className="p-2 bg-gray-50 rounded font-mono text-sm break-all"
              >
                {admin}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "#6C757D" }}>
            No admins found
          </p>
        )}
      </div>

      {message && (
        <div
          className="p-3 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: message.includes("Error")
              ? "rgba(220, 53, 69, 0.1)"
              : "rgba(40, 167, 69, 0.1)",
            color: message.includes("Error")
              ? "#DC3545"
              : "#28A745",
            border: `1px solid ${message.includes("Error") ? "rgba(220, 53, 69, 0.3)" : "rgba(40, 167, 69, 0.3)"}`,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

