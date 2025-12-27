import { Link } from "@tanstack/react-router";
import z from "zod";

export const TemplateCardSchema = z.object({
  id: z.int(),
  name: z.string().trim().nonempty(),
  updatedAt: z.date(),
});

type Props = z.infer<typeof TemplateCardSchema>;

export const TemplateCard = ({ id, name, updatedAt }: Props) => {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{name}</h5>
        <p className="card-text">Last Updated: {updatedAt.toLocaleString()}</p>
        <div className="card-actions">
          <Link to="/template/$id" params={{ id: id.toString() }} className="btn btn-primary">
            View Template
          </Link>
        </div>
      </div>
    </div>
  );
};
