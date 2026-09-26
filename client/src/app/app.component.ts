import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VenueStore } from './core/services/venue/venue.store';
import { ToastOutletComponent } from './layout/toast-outlet/toast-outlet.component';
import { ErrorStateComponent } from './shared/ui/components/error-state/error-state.component';
import { SpinnerComponent } from './shared/ui/components/spinner/spinner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent, ErrorStateComponent, SpinnerComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  protected readonly venueStore = inject(VenueStore);
}
