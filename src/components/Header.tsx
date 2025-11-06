import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4 py-3 flex justify-center items-center">
        <Link to="/" className="text-xl font-bold">
          REEM(D)KNOW
        </Link>
      </div>
    </header>
  );
};
