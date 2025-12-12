"use client";

import { useState } from "react";

interface AdminSegmentManagementProps {
  assignUserToSegment: (userAddress: string, segmentId: number) => Promise<boolean>;
}

export function AdminSegmentManagement({
  assignUserToSegment,
}: AdminSegmentManagementProps) {
  const [userAddress, setUserAddress] = useState<string>("");
  const [segmentId, setSegmentId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleAssign = async () => {
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      setMessage("Error: Please enter a valid Ethereum address");
      return;
    }

    const segId = Number.parseInt(segmentId, 10);
    if (Number.isNaN(segId) || segId < 0 || segId > 5) {
      setMessage("Error: Segment ID must be between 0 (unassign) and 5");
      return;
    }

    setIsAssigning(true);
    setMessage(`Assigning user to segment ${segId === 0 ? "(unassigning)" : segId}...`);
    const success = await assignUserToSegment(userAddress, segId);
    setIsAssigning(false);
    if (success) {
      setMessage(
        segId === 0
          ? "User unassigned from segment successfully!"
          : `User assigned to segment ${segId} successfully!`
      );
      setUserAddress("");
      setSegmentId("");
    } else {
      setMessage("Error: Failed to assign user to segment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="font-semibold mb-3">Assign User to Segment</h3>
        <p className="text-xs mb-3" style={{ color: "#6C757D" }}>
          Enter 0 to unassign a user from their current segment
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="User address (0x...)"
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            disabled={isAssigning}
          />
          <input
            type="number"
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            placeholder="Segment ID (0-5)"
            min="0"
            max="5"
            className="w-full px-3 py-2 border rounded-lg"
            disabled={isAssigning}
          />
          <button
            onClick={handleAssign}
            disabled={isAssigning || !userAddress || segmentId === ""}
            className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#0078D4" }}
          >
            {isAssigning ? "Assigning..." : "Assign to Segment"}
          </button>
        </div>
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

