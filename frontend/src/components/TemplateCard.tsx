import { Link } from "@tanstack/react-router";
import z from "zod";

const TemplateCardSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  guild: z.object({
    id: z.string().trim().nonempty(),
    name: z.string().trim().nonempty(),
    icon: z.url(),
  }),
  updatedAt: z.date(),
});

type Props = z.infer<typeof TemplateCardSchema>;

export const TemplateCard = ({ id, name, guild, updatedAt }: Props) => {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{name}</h5>
        <h6 className="card-subtitle mb-2 text-muted">
          {guild.name} (ID: {guild.id})
        </h6>
        <p className="card-text">
          Last Updated: {updatedAt.toLocaleDateString()} {updatedAt.toLocaleTimeString()}
        </p>
        <div className="card-actions">
          <Link to="/template/$id" params={{ id: id.toString() }} className="btn btn-primary">
            View Template
          </Link>
        </div>
      </div>
    </div>
  );
};
