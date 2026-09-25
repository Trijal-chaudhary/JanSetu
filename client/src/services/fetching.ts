const bkUrl = "http://localhost:3007";
export const givingInfo = async (data: any, messages: any) => {
  const response = await fetch(`${bkUrl}/api/collectingInfo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data, messages }),
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
    body: formData,
  });

  return response.json();
};
