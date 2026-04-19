import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center gap-2 shadow-md">
        <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-xl font-bold">About Asset Wolf</span>
      </div>

      <div className="max-w-xl mx-auto p-6 space-y-6">
        <div className="flex justify-center">
          <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/d9798b5fd_Wolficon.png" className="w-28 h-28 rounded-full object-cover shadow-md" alt="Asset Wolf" />
        </div>

        <div>
          <p className="text-xl font-bold text-gray-900">© 2026 Asset Wolf</p>
          <p className="text-base text-gray-600 mt-1">Asset Wolf is property of Rental World LLC.</p>
        </div>

        <p className="text-base text-gray-600 italic">Developed for Rental World by Manny Huerta</p>

        <div>
          <p className="text-lg font-semibold text-gray-900 mb-3">Special thanks to:</p>
          <ul className="space-y-2 text-gray-600">
            {[
              "Base44.com – AI-powered app development platform (built this app!)",
              "Grok.com – for endless logic, patience, and code companionship",
              "GitHub.com – for version control and collaboration",
              "Render.com – for reliable hosting of the backend",
              "Git.com – for distributed version control",
              "MS PowerShell – for powerful scripting and automation",
              "Android Studio – for Android development environment",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-base italic text-gray-500">Thank you for using Asset Wolf!</p>
      </div>
    </div>
  );
}