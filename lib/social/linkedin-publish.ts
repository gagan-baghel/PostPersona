type LinkedInPublishInput = {
  accessToken: string
  profileId: string
  content: string
  imageUrl?: string | null
}

type LinkedInRegisterUploadResponse = {
  value?: {
    asset?: string
    uploadUrl?: string
    uploadMechanism?: Record<string, { uploadUrl?: string }>
  }
}

type LinkedInPublishResult = {
  postId: string
  assetUrn?: string
}

export class LinkedInPublishError extends Error {
  status?: number
  details?: string

  constructor(message: string, status?: number, details?: string) {
    super(message)
    this.name = "LinkedInPublishError"
    this.status = status
    this.details = details
  }
}

function authorUrn(profileId: string) {
  return `urn:li:person:${profileId}`
}

function getUploadUrl(payload: LinkedInRegisterUploadResponse) {
  const direct = payload?.value?.uploadUrl
  if (direct) return direct

  const mechanism = payload?.value?.uploadMechanism ?? {}
  const first = Object.values(mechanism)[0]
  return first?.uploadUrl
}

async function registerImageUpload(accessToken: string, profileId: string) {
  const response = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn(profileId),
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as LinkedInRegisterUploadResponse
  if (!response.ok) {
    throw new LinkedInPublishError(
      "LinkedIn image register upload failed",
      response.status,
      JSON.stringify(payload).slice(0, 400),
    )
  }

  const assetUrn = payload?.value?.asset
  const uploadUrl = getUploadUrl(payload)

  if (!assetUrn || !uploadUrl) {
    throw new LinkedInPublishError("LinkedIn image upload metadata missing")
  }

  return { assetUrn, uploadUrl }
}

async function uploadImageBytes(uploadUrl: string, sourceImageUrl: string, accessToken: string) {
  const source = await fetch(sourceImageUrl, { cache: "no-store" })
  if (!source.ok) {
    throw new LinkedInPublishError("Failed to fetch source image for LinkedIn upload", source.status)
  }

  const contentType = source.headers.get("content-type") || "application/octet-stream"
  const bytes = await source.arrayBuffer()

  // Signed LinkedIn upload URLs usually don't need auth header; retry with auth for compatibility.
  const put = async (useAuth: boolean) =>
    fetch(uploadUrl, {
      method: "PUT",
      headers: useAuth
        ? {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": contentType,
          }
        : {
            "Content-Type": contentType,
          },
      body: bytes,
    })

  let uploadResponse = await put(false)
  if (!uploadResponse.ok) {
    uploadResponse = await put(true)
  }

  if (!uploadResponse.ok) {
    const detail = await uploadResponse.text().catch(() => "")
    throw new LinkedInPublishError(
      "LinkedIn image binary upload failed",
      uploadResponse.status,
      detail.slice(0, 400),
    )
  }
}

async function createUgcPost({
  accessToken,
  profileId,
  content,
  assetUrn,
}: {
  accessToken: string
  profileId: string
  content: string
  assetUrn?: string
}) {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn(profileId),
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: assetUrn ? "IMAGE" : "NONE",
          media: assetUrn
            ? [
                {
                  status: "READY",
                  media: assetUrn,
                },
              ]
            : undefined,
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new LinkedInPublishError("LinkedIn publish failed", response.status, detail.slice(0, 400))
  }

  const headerPostId = response.headers.get("x-restli-id")
  const json = await response.json().catch(() => ({}))
  const bodyPostId =
    (typeof json?.id === "string" && json.id) ||
    (typeof json?.value?.id === "string" && json.value.id) ||
    (typeof json?.entityUrn === "string" && json.entityUrn)

  return headerPostId || bodyPostId || `li_${Date.now()}`
}

export async function publishToLinkedIn(input: LinkedInPublishInput): Promise<LinkedInPublishResult> {
  const { accessToken, profileId, content, imageUrl } = input
  let assetUrn: string | undefined

  if (imageUrl) {
    const upload = await registerImageUpload(accessToken, profileId)
    await uploadImageBytes(upload.uploadUrl, imageUrl, accessToken)
    assetUrn = upload.assetUrn
  }

  const postId = await createUgcPost({
    accessToken,
    profileId,
    content,
    assetUrn,
  })

  return { postId, assetUrn }
}

