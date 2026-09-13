const toUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organizerEnabled: user.organizerEnabled,
  organizerVerified: user.organizerVerified,
  avatarUrl: user.avatarUrl,
  interests: user.interests,
  city: user.city,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export default toUserResponse;