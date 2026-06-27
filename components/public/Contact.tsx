import { MessageCircle, Phone, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { brand, whatsappLink } from "@/config/brand";
import { copy } from "@/config/copy";

export function Contact() {
  return (
    <section id="contact" className="py-16 sm:py-20">
      <div className="container">
        <div className="mb-10 max-w-xl">
          <h2 className="font-display text-fluid-3 text-text">{copy.contact.title}</h2>
          <p className="mt-3 text-fluid-0 text-text-muted">{copy.contact.sub}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col gap-3 p-6">
            <MessageCircle className="h-6 w-6 text-gold" />
            <p className="text-fluid--1 text-text-muted">WhatsApp</p>
            <a href={whatsappLink("Hi, I'd like to know more about CarVibeDubai.")} target="_blank" rel="noopener noreferrer" className="text-fluid-0 text-text hover:text-gold">
              {brand.whatsappNumber}
            </a>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <Phone className="h-6 w-6 text-gold" />
            <p className="text-fluid--1 text-text-muted">Call</p>
            <a href={`tel:${brand.callNumber}`} className="text-fluid-0 text-text hover:text-gold">
              {brand.callNumber}
            </a>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <Clock className="h-6 w-6 text-gold" />
            <p className="text-fluid--1 text-text-muted">Hours</p>
            <p className="text-fluid-0 text-text">{brand.hours}</p>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <MapPin className="h-6 w-6 text-gold" />
            <p className="text-fluid--1 text-text-muted">Location</p>
            <p className="text-fluid-0 text-text">{brand.address}</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
