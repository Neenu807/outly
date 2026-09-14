const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const formatDate = (value) => (value ? dateFormat.format(new Date(value)) : "—");

export default formatDate;
