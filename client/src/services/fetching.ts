const bkUrl = "http://localhost:3007";

export const signupUser = async (data: FormData | Record<string, any>) => {
  let body: FormData | string;
  const headers: Record<string, string> = {};

  if (data instanceof FormData) {
    body = data;
  } else {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === "location" && typeof data[key] === "object" && data[key] !== null) {
        formData.append("location", JSON.stringify(data[key]));
      } else if (data[key] instanceof File) {
        formData.append(key, data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, String(data[key]));
      }
    });
    body = formData;
  }

  const response = await fetch(`${bkUrl}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  return response.json();
};

export const loginUser = async (data: any) => {
  const response = await fetch(`${bkUrl}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const getMeUser = async () => {
  const response = await fetch(`${bkUrl}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });
  return response.json();
};

export const logoutUser = async () => {
  const response = await fetch(`${bkUrl}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return response.json();
};

export const givingInfo = async (data: any, messages: any, reportDraft?: any) => {
  const response = await fetch(`${bkUrl}/api/collectingInfo`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data, messages, reportDraft }),
  });
  return response.json();
};

export const uploadingEvidence = async (files: File[]) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("evidence", file);
  });

  const response = await fetch(`${bkUrl}/api/uploadingEvedince`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  return response.json();
};

export const manualReport = async (data: any) => {
  const response = await fetch(`${bkUrl}/api/manual_report`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });
  return response.json();
};

export const saveDraft = async (draft: any, draftId?: string) => {
  try {
    const response = await fetch(`${bkUrl}/api/reports/draft`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ draft, draftId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && data.success === undefined) {
      data.success = false;
      data.message = data.message || `Server returned ${response.status}: ${response.statusText}`;
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to connect to server.",
    };
  }
};

export const getDraft = async (draftId: string) => {
  try {
    const response = await fetch(`${bkUrl}/api/reports/draft/${draftId}`, {
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && data.success === undefined) {
      data.success = false;
      data.message = data.message || `Server returned ${response.status}: ${response.statusText}`;
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to connect to server.",
    };
  }
};

export const classifyDraft = async (draftId: string, forceReclassify?: boolean) => {
  try {
    const response = await fetch(`${bkUrl}/api/reports/draft/${draftId}/classify`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ forceReclassify }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && data.success === undefined) {
      data.success = false;
      data.message = data.message || `Server returned ${response.status}: ${response.statusText}`;
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to connect to server for classification.",
    };
  }
};

export const submitFinalDraft = async (draftId: string, skipSimilarityCheck?: boolean) => {
  try {
    const response = await fetch(`${bkUrl}/api/reports/draft/${draftId}/submit`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ skipSimilarityCheck }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && data.success === undefined) {
      data.success = false;
      data.message = data.message || `Server returned ${response.status}: ${response.statusText}`;
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to connect to server for submission.",
    };
  }
};

export const checkDraftSimilarReports = async (draftId: string) => {
  try {
    const response = await fetch(`${bkUrl}/api/reports/draft/${draftId}/check-similar`, {
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && data.success === undefined) {
      data.success = false;
      data.message = data.message || `Server returned ${response.status}: ${response.statusText}`;
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to connect to server for similarity check.",
    };
  }
};

export const getReports = async () => {
  const response = await fetch(`${bkUrl}/api/getReports`, {
    credentials: "include",
  });

  return response.json();
};

export const getUsers = async () => {
  const response = await fetch(`${bkUrl}/api/getUsers`, {
    credentials: "include",
  });

  return response.json();
};

export const toggleSupportReport = async (reportId: string, userId?: string) => {
  const response = await fetch(`${bkUrl}/api/reports/${reportId}/support`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  return response.json();
};

export const getReportComments = async (
  reportId: string,
  sort: string = "top",
  userId?: string
) => {
  const params = new URLSearchParams();
  if (sort) params.append("sort", sort);
  if (userId) params.append("userId", userId);
  const queryStr = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${bkUrl}/api/reports/${reportId}/comments${queryStr}`, {
    credentials: "include",
  });

  return response.json();
};

export const addReportComment = async (
  reportId: string,
  userId?: string,
  comment?: string,
  parentCommentId?: string | null
) => {
  const response = await fetch(`${bkUrl}/api/reports/${reportId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, comment, parentCommentId }),
  });

  return response.json();
};

export const voteReportComment = async (
  commentId: string,
  direction: "up" | "down",
  userId?: string
) => {
  const response = await fetch(`${bkUrl}/api/reports/comments/${commentId}/vote`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ direction, userId }),
  });

  return response.json();
};

export const likeReportComment = async (commentId: string, userId?: string) => {
  return voteReportComment(commentId, "up", userId);
};

export const getReportById = async (reportId: string) => {
  const response = await fetch(`${bkUrl}/api/reports/${reportId}`, {
    credentials: "include",
  });

  return response.json();
};

export const updateUserProfile = async (data: FormData | Record<string, any>) => {
  let body: FormData | string;
  const headers: Record<string, string> = {};

  if (data instanceof FormData) {
    body = data;
  } else {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (data[key] instanceof File) {
        formData.append(key, data[key]);
      } else if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, String(data[key]));
      }
    });
    body = formData;
  }

  const response = await fetch(`${bkUrl}/api/auth/profile`, {
    method: "PUT",
    credentials: "include",
    headers,
    body,
  });

  return response.json();
};

export const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

export const getProfileImageUrl = (photoPath?: string | null): string => {
  if (!photoPath || typeof photoPath !== "string" || !photoPath.trim()) {
    return DEFAULT_AVATAR;
  }
  const trimmed = photoPath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${bkUrl}${cleanPath}`;
};

export const confirmReportResolution = async (reportId: string) => {
  const response = await fetch(`${bkUrl}/api/reports/${reportId}/confirm-resolution`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.json();
};

export const reopenReport = async (reportId: string, remark?: string) => {
  const response = await fetch(`${bkUrl}/api/reports/${reportId}/reopen`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ remark }),
  });

  return response.json();
};

export const getNotifications = async (userId?: string) => {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const response = await fetch(`${bkUrl}/api/notifications${query}`, {
    credentials: "include",
  });

  return response.json();
};

export const markNotificationRead = async (notificationId: string) => {
  const response = await fetch(`${bkUrl}/api/notifications/${notificationId}/read`, {
    method: "PUT",
    credentials: "include",
  });

  return response.json();
};

export const markAllNotificationsRead = async (userId?: string) => {
  const response = await fetch(`${bkUrl}/api/notifications/read-all`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  return response.json();
};

export const checkSimilarReports = async (data: any) => {
  const response = await fetch(`${bkUrl}/api/reports/check-similar`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
};

